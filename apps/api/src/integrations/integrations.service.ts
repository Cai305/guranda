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
import { OAuthAdapter } from './adapters/oauth-adapter.interface';
import { tiktokAdapter } from './adapters/tiktok.adapter';
import { xAdapter } from './adapters/x.adapter';
import { verifyTelegramBotToken, getTelegramUpdates } from './adapters/telegram.adapter';
import { verifyWhatsAppCredentials } from './adapters/whatsapp.adapter';

const STATE_PURPOSE = 'integration-oauth-state';
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'https://guranda.onrender.com';

// The `'telegram'` and `'whatsapp'` string literals here are intentionally
// NOT part of IntegrationProvider (see oauth-providers.ts) — neither
// connection is OAuth2 (see adapters/telegram.adapter.ts and
// adapters/whatsapp.adapter.ts). Both are still stored in the same
// ExternalIntegration table/row shape as every OAuth provider, just with no
// refreshToken and a directly-pasted credential (a bot token for telegram; a
// system-user access token + phone_number_id for whatsapp) in place of an
// OAuth access token.
export type StoredProvider = IntegrationProvider | 'telegram' | 'whatsapp';

// Only the providers whose token exchange/refresh genuinely can't be
// expressed by the generic body-form POST below (see oauth-providers.ts's
// `usesAdapter` flag for why each one needs this).
const ADAPTERS: Partial<Record<IntegrationProvider, OAuthAdapter>> = {
  tiktok: tiktokAdapter,
  x: xAdapter,
};

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
    const adapter = ADAPTERS[provider];
    // PKCE (currently just X): generate the verifier now and smuggle it
    // through the redirect round-trip inside the signed state JWT, rather
    // than a separate server-side session store — the state is already the
    // security boundary for recovering `userId` on callback (see
    // decodeState), so it's the natural place for this too.
    const codeVerifier = adapter?.usesPkce ? adapter.generateCodeVerifier?.() : undefined;
    const state = this.jwt.sign(
      { userId, provider, purpose: STATE_PURPOSE, codeVerifier },
      { expiresIn: '10m' },
    );
    const clientIdParam = cfg.clientIdParamName || 'client_id';
    const paramsObj: Record<string, string> = {
      [clientIdParam]: process.env[cfg.clientIdEnv]!,
      redirect_uri: this.redirectUri(provider),
      scope: cfg.scope,
      state,
      response_type: 'code',
      ...(cfg.extraAuthorizeParams || {}),
      ...(adapter?.buildAuthorizeParams ? adapter.buildAuthorizeParams({ codeVerifier }) : {}),
    };
    return `${cfg.authorizeUrl}?${new URLSearchParams(paramsObj).toString()}`;
  }

  private decodeState(provider: IntegrationProvider, state: string): { userId: string; codeVerifier?: string } {
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
    return { userId: payload.userId, codeVerifier: payload.codeVerifier };
  }

  async handleCallback(provider: IntegrationProvider, code: string, state: string): Promise<void> {
    const { userId, codeVerifier } = this.decodeState(provider, state);
    const cfg = OAUTH_PROVIDERS[provider];
    const tokens = await this.exchangeCode(provider, code, codeVerifier);
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

  private async exchangeCode(provider: IntegrationProvider, code: string, codeVerifier?: string): Promise<ExchangedTokens> {
    const cfg = OAUTH_PROVIDERS[provider];
    const adapter = ADAPTERS[provider];
    if (adapter) {
      return adapter.exchangeCode({
        code,
        redirectUri: this.redirectUri(provider),
        codeVerifier,
        clientId: process.env[cfg.clientIdEnv]!,
        clientSecret: process.env[cfg.clientSecretEnv]!,
        tokenUrl: cfg.tokenUrl,
      });
    }

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
      // Facebook's Graph API returns its rejection as a nested error OBJECT
      // ({ message, type, code, fbtrace_id }), not a flat string like every
      // other provider here — interpolating data.error directly would
      // collapse to "[object Object]", hiding Meta's real rejection reason.
      const errorText =
        typeof data.error === 'object' && data.error !== null
          ? data.error.message || JSON.stringify(data.error)
          : data.error_description || data.error;
      throw new BadRequestException(
        `Failed to connect ${cfg.label}: ${errorText || 'unknown error'}`,
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

  // Every OAuth provider (from OAUTH_PROVIDERS) plus telegram, which isn't
  // OAuth2 but shares the same ExternalIntegration storage and the same
  // "connected/not connected, configured/not configured in this
  // environment" shape the mobile Connected Apps screen renders generically
  // — so it belongs in the same list rather than a separate endpoint the UI
  // would have to special-case.
  async listForUser(userId: string) {
    const rows = await this.prisma.externalIntegration.findMany({ where: { userId } });
    const oauthList = (Object.keys(OAUTH_PROVIDERS) as IntegrationProvider[]).map((provider) => {
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
    const telegramRow = rows.find((r) => r.provider === 'telegram');
    const whatsappRow = rows.find((r) => r.provider === 'whatsapp');
    return [
      ...oauthList,
      {
        provider: 'telegram' as const,
        label: 'Telegram',
        // No app-level client id/secret to be missing here — the real
        // gating requirement is having somewhere safe to store the user's
        // bot token, i.e. encryption being configured.
        configured: isEncryptionConfigured(),
        connected: !!telegramRow,
        accountLabel: telegramRow?.externalAccountLabel ?? null,
        connectedAt: telegramRow?.createdAt ?? null,
        // Phase 8: null until the user has picked a real chat_id via
        // POST /integrations/telegram/default-chat — mobile uses this to
        // decide whether the "Also post to Telegram" composer toggle can
        // be shown at all (see CreatePostScreen.tsx).
        telegramDefaultChatId: telegramRow?.telegramDefaultChatId ?? null,
      },
      {
        provider: 'whatsapp' as const,
        label: 'WhatsApp',
        // Same posture as telegram: no app-level client id/secret, just
        // somewhere safe to store the user's own pasted-in system-user
        // access token + phone_number_id.
        configured: isEncryptionConfigured(),
        connected: !!whatsappRow,
        accountLabel: whatsappRow?.externalAccountLabel ?? null,
        connectedAt: whatsappRow?.createdAt ?? null,
      },
    ];
  }

  async disconnect(userId: string, provider: StoredProvider): Promise<void> {
    await this.prisma.externalIntegration.deleteMany({ where: { userId, provider } });
  }

  // --- Telegram (bot token, not OAuth2 — see adapters/telegram.adapter.ts) ---

  async connectTelegram(userId: string, botToken: string): Promise<{ username: string }> {
    if (!isEncryptionConfigured()) {
      throw new ServiceUnavailableException(
        "Telegram connections aren't available yet in this environment — INTEGRATIONS_ENCRYPTION_KEY isn't set.",
      );
    }
    // Throws with Telegram's real rejection reason if the token is invalid —
    // never saved unless this genuinely succeeds.
    const identity = await verifyTelegramBotToken(botToken);
    const trimmed = botToken.trim();
    await this.prisma.externalIntegration.upsert({
      where: { userId_provider: { userId, provider: 'telegram' } },
      create: {
        userId,
        provider: 'telegram',
        accessToken: encryptSecret(trimmed),
        externalAccountLabel: `@${identity.username}`,
      },
      update: {
        accessToken: encryptSecret(trimmed),
        externalAccountLabel: `@${identity.username}`,
      },
    });
    return { username: identity.username };
  }

  // Raw bot token for the telegram-ai-tools.provider.ts handler. Unlike
  // getValidAccessToken below, there's no refresh concept for a bot token —
  // it's either valid or the user needs to paste a new one.
  async getTelegramBotToken(userId: string): Promise<string | null> {
    const row = await this.prisma.externalIntegration.findUnique({
      where: { userId_provider: { userId, provider: 'telegram' } },
    });
    return row ? decryptSecret(row.accessToken) : null;
  }

  // Live bot identity check for the mobile Connected Apps card ("Verify" —
  // a real getMe call, not just replaying the label saved at connect time).
  async getTelegramIdentity(userId: string) {
    const token = await this.getTelegramBotToken(userId);
    if (!token) return null;
    return verifyTelegramBotToken(token);
  }

  // On-demand "recent activity" refresh for the mobile Connected Apps card
  // (GET /integrations/telegram/updates), alongside the background poll in
  // telegram-poll.service.ts. Deliberately reads with the integration's last
  // CONFIRMED offset (never advances it) — a manual refresh must never
  // consume updates the background poller hasn't turned into a Notification
  // yet, or that message would never get one.
  async getTelegramRecentUpdates(userId: string) {
    const row = await this.prisma.externalIntegration.findUnique({
      where: { userId_provider: { userId, provider: 'telegram' } },
    });
    if (!row) return [];
    const token = decryptSecret(row.accessToken);
    const offset = row.telegramLastUpdateId !== null ? row.telegramLastUpdateId + 1 : undefined;
    return getTelegramUpdates(token, offset);
  }

  // --- WhatsApp (Cloud API system-user token + phone_number_id, not
  // OAuth2 — see adapters/whatsapp.adapter.ts) ---

  async connectWhatsApp(userId: string, accessToken: string, phoneNumberId: string): Promise<{ displayPhoneNumber: string }> {
    if (!isEncryptionConfigured()) {
      throw new ServiceUnavailableException(
        "WhatsApp connections aren't available yet in this environment — INTEGRATIONS_ENCRYPTION_KEY isn't set.",
      );
    }
    // Throws with Meta's real rejection reason if the token/phoneNumberId
    // pair is invalid — never saved unless this genuinely succeeds.
    const identity = await verifyWhatsAppCredentials(accessToken, phoneNumberId);
    await this.prisma.externalIntegration.upsert({
      where: { userId_provider: { userId, provider: 'whatsapp' } },
      create: {
        userId,
        provider: 'whatsapp',
        accessToken: encryptSecret(accessToken.trim()),
        whatsappPhoneNumberId: identity.phoneNumberId,
        externalAccountLabel: identity.displayPhoneNumber,
      },
      update: {
        accessToken: encryptSecret(accessToken.trim()),
        whatsappPhoneNumberId: identity.phoneNumberId,
        externalAccountLabel: identity.displayPhoneNumber,
      },
    });
    return { displayPhoneNumber: identity.displayPhoneNumber };
  }

  // Raw credentials for the whatsapp-ai-tools.provider.ts handler. Unlike
  // getValidAccessToken below, there's no refresh concept for a system-user
  // token — it's either valid or the user needs to paste a new one.
  async getWhatsAppCredentials(userId: string): Promise<{ accessToken: string; phoneNumberId: string } | null> {
    const row = await this.prisma.externalIntegration.findUnique({
      where: { userId_provider: { userId, provider: 'whatsapp' } },
    });
    if (!row || !row.whatsappPhoneNumberId) return null;
    return { accessToken: decryptSecret(row.accessToken), phoneNumberId: row.whatsappPhoneNumberId };
  }

  // --- Telegram default publish chat (Phase 8: "publish everywhere") ---
  //
  // A bot can only send into a chat that has already messaged it or added
  // it — there is no way to discover "the user's own DMs" from a bot
  // token alone (Bot API platform constraint, same one Phase 6 hit for
  // getUpdates). So the fan-out target can't be inferred; the user picks
  // one real chat_id, once, from their own real getUpdates() results (see
  // ConnectedAppsScreen.tsx's "Recent activity" list) and it's remembered
  // here. Everything downstream (the seeded Blueprint, the mobile
  // publish-everywhere toggle) treats a null value as "not configured yet"
  // and fails honestly rather than guessing.

  async setTelegramDefaultChatId(userId: string, chatId: number): Promise<{ telegramDefaultChatId: number }> {
    if (!Number.isFinite(chatId)) {
      throw new BadRequestException('chatId must be a real Telegram chat id (a number).');
    }
    const row = await this.prisma.externalIntegration.findUnique({
      where: { userId_provider: { userId, provider: 'telegram' } },
    });
    if (!row) {
      throw new BadRequestException('Connect a Telegram bot before setting a default publish chat.');
    }
    const updated = await this.prisma.externalIntegration.update({
      where: { id: row.id },
      data: { telegramDefaultChatId: Math.trunc(chatId) },
    });
    return { telegramDefaultChatId: updated.telegramDefaultChatId! };
  }

  async getTelegramDefaultChatId(userId: string): Promise<number | null> {
    const row = await this.prisma.externalIntegration.findUnique({
      where: { userId_provider: { userId, provider: 'telegram' } },
    });
    return row?.telegramDefaultChatId ?? null;
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
    const adapter = ADAPTERS[provider];
    if (adapter?.refresh) {
      return adapter.refresh({
        refreshToken,
        clientId: process.env[cfg.clientIdEnv]!,
        clientSecret: process.env[cfg.clientSecretEnv]!,
        tokenUrl: cfg.tokenUrl,
      });
    }
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
