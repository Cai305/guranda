import { BadRequestException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { OAuthAdapter, OAuthExchangeContext, OAuthRefreshContext, OAuthTokenResult } from './oauth-adapter.interface';

// X (Twitter) OAuth 2.0 Authorization Code flow with PKCE
// (https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code).
// Two genuine differences from the generic shape google_calendar/github/
// slack/youtube/linkedin all share:
//  1. PKCE (code_verifier/code_challenge) is required even for a
//     confidential client with a client secret.
//  2. The token/refresh endpoints authenticate via an HTTP Basic auth
//     header (base64 of "client_id:client_secret"), not body params.
function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const xAdapter: OAuthAdapter = {
  usesPkce: true,

  generateCodeVerifier(): string {
    return base64url(randomBytes(32));
  },

  buildAuthorizeParams({ codeVerifier }: { codeVerifier?: string }): Record<string, string> {
    if (!codeVerifier) {
      // Internal bug, not a user-facing config problem — createAuthorizeUrl
      // always generates a verifier before calling this for a usesPkce
      // adapter, so getting here means that wiring broke.
      throw new Error('xAdapter.buildAuthorizeParams called without a codeVerifier.');
    }
    const challenge = base64url(createHash('sha256').update(codeVerifier).digest());
    return { code_challenge: challenge, code_challenge_method: 'S256' };
  },

  async exchangeCode({ code, redirectUri, codeVerifier, clientId, clientSecret, tokenUrl }: OAuthExchangeContext): Promise<OAuthTokenResult> {
    if (!codeVerifier) {
      throw new BadRequestException('Missing PKCE code verifier for this X connection attempt — try connecting again.');
    }
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new BadRequestException(
        `Failed to connect X: ${data.error_description || data.error || `HTTP ${res.status}`}`,
      );
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
    };
  },

  async refresh({ refreshToken, clientId, clientSecret, tokenUrl }: OAuthRefreshContext) {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token', client_id: clientId }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new BadRequestException('Failed to refresh X access — reconnect it in Settings.');
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  },
};
