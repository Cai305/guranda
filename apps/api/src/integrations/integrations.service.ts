import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { encryptSecret, decryptSecret, isEncryptionConfigured } from '../common/crypto.util';
import {
  OAUTH_PROVIDERS,
  IntegrationProvider,
  isProviderConfigured,
} from './oauth-providers';

const STATE_PURPOSE = 'integration-oauth-state';
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'https://guranda.onrender.com';

interface ExchangedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  accountLabel?: string;
}

// OAuth connect/callback + encrypted token storage/refresh for the external
// services Nova can reach out to (Google Calendar, GitHub, Slack). The
// mobile app never sees a client secret or a raw token — it calls
// createAuthorizeUrl() (authenticated) to get a URL to open in the system
// browser, the provider redirects to this API's own /integrations/:provider/
// callback (public, no app JWT available — see IntegrationsController), and
// this service resolves *whose* connection that is via the signed `state`
// it minted, never a session cookie or client-supplied userId.
@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private redirectUri(provider: IntegrationProvider): string {
    return `${API_PUBLIC_URL}/integrations/${provider}/callback`;
  }

  isReady(provider: IntegrationProvider): boolean {
    return isProviderConfigured(provider) && isEncryptionConfigured();
  }

  async createAuthorizeUrl(userId: string, provider: IntegrationProvider): Promise<string> {
    if (!this.isReady(provider)) {
      throw new ServiceUnavailableException(
        `${OAUTH_PROVIDERS[provider].label} isn't set up yet — check back later.`,
      );
    }
    const cfg = OAUTH_PROVIDERS[provider];
    const state = this.jwt.sign(
      { userId, provider, purpose: STATE_PURPOSE },
      { expiresIn: '10m' },
    );
    const params = new URLSearchParams({
      client_id: process.env[cfg.clientIdEnv]!,
      redirect_uri: this.redirectUri(provider),
      scope: cfg.scope,
      state,
      response_type: 'code',
      ...(cfg.extraAuthorizeParams || {}),
    });
    return `${cfg.authorizeUrl}?${params.toString()}`;
  }

  private decodeState(provider: IntegrationProvider, state: string): string {
    let payload: any;
    try {
      payload = this.jwt.verify(state);
    } catch {
      throw new BadRequestException(
        'This connection request expired or is invalid — try connecting again.',
      );
    }
    if (payload?.purpose !== STATE_PURPOSE || payload?.provider !== provider) {
      throw new BadRequestException('Invalid connection request.');
    }
    return payload.userId;
  }

  async handleCallback(provider: IntegrationProvider, code: string, state: string): Promise<void> {
    const userId = this.decodeState(provider, state);
    const cfg = OAUTH_PROVIDERS[provider];
    const tokens = await this.exchangeCode(provider, code);
    await this.prisma.externalIntegration.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        accessToken: encryptSecret(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? cfg.scope,
        externalAccountLabel: tokens.accountLabel ?? null,
      },
      update: {
        accessToken: encryptSecret(tokens.accessToken),
        ...(tokens.refreshToken ? { refreshToken: encryptSecret(tokens.refreshToken) } : {}),
        expiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? cfg.scope,
        ...(tokens.accountLabel ? { externalAccountLabel: tokens.accountLabel } : {}),
      },
    });
  }

  private async exchangeCode(provider: IntegrationProvider, code: string): Promise<ExchangedTokens> {
    const cfg = OAUTH_PROVIDERS[provider];
    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: process.env[cfg.clientIdEnv]!,
        client_secret: process.env[cfg.clientSecretEnv]!,
        code,
        redirect_uri: this.redirectUri(provider),
        grant_type: 'authorization_code',
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error || data.ok === false) {
      throw new BadRequestException(
        `Failed to connect ${cfg.label}: ${data.error_description || data.error || 'unknown error'}`,
      );
    }

    // Slack's oauth.v2.access shape differs from the standard OAuth2 token
    // response every other provider here uses.
    if (provider === 'slack') {
      return {
        accessToken: data.access_token,
        scope: data.scope,
        accountLabel: data.team?.name,
      };
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
    };
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.externalIntegration.findMany({ where: { userId } });
    return (Object.keys(OAUTH_PROVIDERS) as IntegrationProvider[]).map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      return {
        provider,
        label: OAUTH_PROVIDERS[provider].label,
        configured: isProviderConfigured(provider),
        connected: !!row,
        accountLabel: row?.externalAccountLabel ?? null,
        connectedAt: row?.createdAt ?? null,
      };
    });
  }

  async disconnect(userId: string, provider: IntegrationProvider): Promise<void> {
    await this.prisma.externalIntegration.deleteMany({ where: { userId, provider } });
  }

  // Live, ready-to-use access token for this user+provider — transparently
  // refreshes an expired Google token first. Returns null if the user
  // hasn't connected this provider (callers should surface a clear
  // "connect it in Settings" message, not a raw error).
  async getValidAccessToken(userId: string, provider: IntegrationProvider): Promise<string | null> {
    const row = await this.prisma.externalIntegration.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!row) return null;

    const cfg = OAUTH_PROVIDERS[provider];
    if (cfg.supportsRefresh && row.refreshToken && row.expiresAt && row.expiresAt < new Date()) {
      const refreshed = await this.refresh(provider, decryptSecret(row.refreshToken));
      await this.prisma.externalIntegration.update({
        where: { id: row.id },
        data: {
          accessToken: encryptSecret(refreshed.accessToken),
          expiresAt: refreshed.expiresAt ?? null,
        },
      });
      return refreshed.accessToken;
    }
    return decryptSecret(row.accessToken);
  }

  private async refresh(
    provider: IntegrationProvider,
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const cfg = OAUTH_PROVIDERS[provider];
    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: process.env[cfg.clientIdEnv]!,
        client_secret: process.env[cfg.clientSecretEnv]!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new BadRequestException(`Failed to refresh ${cfg.label} access — reconnect it in Settings.`);
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }
}
