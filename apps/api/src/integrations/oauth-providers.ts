export type IntegrationProvider = 'google_calendar' | 'github' | 'slack';

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
};

export function isProviderConfigured(provider: IntegrationProvider): boolean {
  const cfg = OAUTH_PROVIDERS[provider];
  return !!process.env[cfg.clientIdEnv] && !!process.env[cfg.clientSecretEnv];
}
