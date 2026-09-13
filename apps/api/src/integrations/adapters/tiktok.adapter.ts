import { BadRequestException } from '@nestjs/common';
import { OAuthAdapter, OAuthExchangeContext, OAuthRefreshContext, OAuthTokenResult } from './oauth-adapter.interface';

// TikTok for Developers OAuth2
// (https://developers.tiktok.com/doc/oauth-user-access-token-management/).
// The authorize URL already gets its client id under the 'client_key' query
// param via oauth-providers.ts's clientIdParamName — this adapter only
// covers the two calls that ALSO need 'client_key' instead of 'client_id':
// the token exchange and the refresh call. Everything else (JSON body,
// access_token/refresh_token/expires_in fields) matches the generic shape.
export const tiktokAdapter: OAuthAdapter = {
  async exchangeCode({ code, redirectUri, clientId, clientSecret, tokenUrl }: OAuthExchangeContext): Promise<OAuthTokenResult> {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_key: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new BadRequestException(
        `Failed to connect TikTok: ${data.error_description || data.error || `HTTP ${res.status}`}`,
      );
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
      accountLabel: data.open_id ? `TikTok user ${data.open_id}` : undefined,
    };
  },

  async refresh({ refreshToken, clientId, clientSecret, tokenUrl }: OAuthRefreshContext) {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_key: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new BadRequestException('Failed to refresh TikTok access — reconnect it in Settings.');
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  },
};
