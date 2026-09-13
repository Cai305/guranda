// Shared contract for the small number of OAuth providers whose token
// exchange/refresh genuinely can't be expressed by the generic body-form
// POST that IntegrationsService already uses for google_calendar/github/
// slack/youtube/linkedin (see integrations.service.ts's exchangeCode()/
// refresh()). Only register a provider here when it ACTUALLY differs —
// most new providers should NOT need one of these; see oauth-providers.ts's
// `usesAdapter` flag for which ones do and why.

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  accountLabel?: string;
}

export interface OAuthExchangeContext {
  code: string;
  redirectUri: string;
  /** Present only when the provider's OAuthProviderConfig implies PKCE (currently just X). */
  codeVerifier?: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

export interface OAuthRefreshContext {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

export interface OAuthAdapter {
  /** True if this provider requires a PKCE code_verifier/code_challenge pair generated per authorize call. */
  usesPkce?: boolean;
  /** Only present when usesPkce is true. Called once per createAuthorizeUrl(), before the state JWT is signed — the verifier is embedded in that signed state so it survives the redirect round-trip without a separate server-side session store. */
  generateCodeVerifier?(): string;
  /** Extra authorize-URL query params beyond what IntegrationsService already builds generically (client id, redirect_uri, scope, state, response_type, extraAuthorizeParams). */
  buildAuthorizeParams?(ctx: { codeVerifier?: string }): Record<string, string>;
  /** Real token exchange call. Must throw (BadRequestException) on any non-success response — never return a fabricated result. */
  exchangeCode(ctx: OAuthExchangeContext): Promise<OAuthTokenResult>;
  /** Real refresh call. Only invoked when the provider's supportsRefresh is true. */
  refresh?(ctx: OAuthRefreshContext): Promise<{ accessToken: string; expiresAt?: Date }>;
}
