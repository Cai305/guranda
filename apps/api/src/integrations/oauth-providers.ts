// NOTE: 'telegram' is deliberately NOT part of this union. Telegram bot
// integration isn't OAuth2 at all — there's no authorize redirect, no app
// client id/secret, no consent screen. It's a single long-lived bot token
// the user gets from @BotFather and pastes in directly (see
// adapters/telegram.adapter.ts + IntegrationsService.connectTelegram). Every
// provider in this file/union genuinely is OAuth2, so telegram is handled
// as its own thing end-to-end rather than forced into this shape.
export type IntegrationProvider =
  | 'google_calendar'
  | 'github'
  | 'slack'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'linkedin'
  | 'facebook';

export interface OAuthProviderConfig {
  provider: IntegrationProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Extra query params the authorize URL needs beyond client_id/redirect_uri/scope/state/response_type. */
  extraAuthorizeParams?: Record<string, string>;
  /** Whether the token endpoint returns a refresh_token this app should use to renew access without the user re-authorizing. */
  supportsRefresh: boolean;
  /**
   * Query-param name for the client id on the AUTHORIZE url only (token/
   * refresh request bodies are built by the provider's adapter when one is
   * registered — see adapters/). Defaults to 'client_id'. TikTok is the one
   * real-world case that differs: it uses 'client_key'.
   */
  clientIdParamName?: string;
  /**
   * True if this provider needs an adapter (see integrations.service.ts's
   * ADAPTERS map / apps/api/src/integrations/adapters/) for its token
   * exchange and/or refresh call because the generic body-form POST this
   * file's siblings (google_calendar/github/slack/youtube/linkedin) all
   * share doesn't apply — e.g. X requires PKCE + HTTP Basic auth, TikTok
   * requires 'client_key' instead of 'client_id' in the token body.
   */
  usesAdapter?: boolean;
}

// Real, publicly-documented OAuth2 endpoints for each provider — stable
// surfaces, unlike Expo's SDK (see apps/mobile/AGENTS.md). Client
// id/secret are read from env at call time (see integrations.service.ts),
// not required for the API to boot — the user creates each OAuth app
// themselves and adds the credentials to Render later.
export const OAUTH_PROVIDERS: Record<IntegrationProvider, OAuthProviderConfig> = {
  google_calendar: {
    provider: 'google_calendar',
    label: 'Google Calendar',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    clientIdEnv: 'GOOGLE_CALENDAR_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CALENDAR_CLIENT_SECRET',
    extraAuthorizeParams: { access_type: 'offline', prompt: 'consent' },
    supportsRefresh: true,
  },
  github: {
    provider: 'github',
    label: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'repo read:user',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    supportsRefresh: false,
  },
  slack: {
    provider: 'slack',
    label: 'Slack',
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scope: 'channels:read,groups:read,chat:write',
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
    supportsRefresh: false,
  },
  // YouTube Data API v3 reuses Google's own OAuth2 endpoints (same as
  // google_calendar above) — it's a different scope on the same identity
  // provider, not a different OAuth implementation. Kept as a separate
  // client id/secret (a separate Google Cloud OAuth client) rather than
  // reusing GOOGLE_CALENDAR_CLIENT_ID/SECRET, since a real deployment would
  // very plausibly want to scope/rotate/revoke YouTube access independently
  // of Calendar access.
  youtube: {
    provider: 'youtube',
    label: 'YouTube',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    extraAuthorizeParams: { access_type: 'offline', prompt: 'consent' },
    supportsRefresh: true,
  },
  // TikTok for Developers OAuth2
  // (https://developers.tiktok.com/doc/oauth-user-access-token-management/).
  // Genuinely different from the others: the client id is sent as
  // 'client_key' (not 'client_id') on both the authorize URL and the token
  // endpoint, so this provider is routed through adapters/tiktok.adapter.ts
  // for its token exchange/refresh (see usesAdapter below).
  tiktok: {
    provider: 'tiktok',
    label: 'TikTok',
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scope: 'user.info.basic,video.list',
    clientIdEnv: 'TIKTOK_CLIENT_ID',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    clientIdParamName: 'client_key',
    supportsRefresh: true,
    usesAdapter: true,
  },
  // X (Twitter) OAuth 2.0 Authorization Code flow with PKCE
  // (https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code).
  // Genuinely different from the others: requires a PKCE code_verifier/
  // code_challenge pair even for a confidential client, and the token/
  // refresh endpoints authenticate via an HTTP Basic auth header rather than
  // client_id/client_secret in the body — routed through
  // adapters/x.adapter.ts (see usesAdapter below).
  x: {
    provider: 'x',
    label: 'X (Twitter)',
    authorizeUrl: 'https://x.com/i/oauth2/authorize',
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    scope: 'tweet.read tweet.write users.read offline.access',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    supportsRefresh: true,
    usesAdapter: true,
  },
  // LinkedIn "Sign In with LinkedIn using OpenID Connect" — the one LinkedIn
  // product tier every registered app gets by default, unlike its
  // w_member_social/r_* scopes which require partner approval Guranda
  // doesn't have. Scope/endpoints match the generic body-form shape
  // (google_calendar/github/slack/youtube), so no adapter is needed.
  // LinkedIn does not issue refresh tokens to apps on this default tier, so
  // supportsRefresh is honestly false — a connection expires (60 days) and
  // the user reconnects, same as GitHub tokens today.
  linkedin: {
    provider: 'linkedin',
    label: 'LinkedIn',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: 'openid profile email',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    supportsRefresh: false,
  },
  // Facebook Login (Meta Graph API) OAuth2
  // (https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow).
  // Scope is deliberately kept to what a fresh, non-reviewed dev-mode
  // Facebook app can actually use: 'public_profile' and 'email' work for
  // any app immediately (no review needed for the app's own admins/
  // testers/developers). Broader permissions like 'pages_manage_posts',
  // 'publish_to_groups', or anything that would let Nova post on the
  // user's behalf require Meta App Review (a manual submission + demo
  // video review process Guranda hasn't gone through) before they'd work
  // for anyone outside the app's own Meta dev-role list — so posting
  // actions are out of scope for this phase (see facebook-ai-tools.
  // provider.ts, which only exposes a read-only getProfile action).
  // Token exchange/refresh matches the generic body-form POST shape
  // (google_calendar/github/slack/youtube/linkedin all share it), so no
  // adapter is needed. Facebook does not issue refresh tokens the way
  // Google does — a long-lived (~60 day) access token is obtained via a
  // second call this app doesn't make in this phase, so supportsRefresh is
  // honestly false, same posture as GitHub/LinkedIn.
  facebook: {
    provider: 'facebook',
    label: 'Facebook',
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scope: 'public_profile,email',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    supportsRefresh: false,
  },
};

export function isProviderConfigured(provider: IntegrationProvider): boolean {
  const cfg = OAUTH_PROVIDERS[provider];
  return !!process.env[cfg.clientIdEnv] && !!process.env[cfg.clientSecretEnv];
}
