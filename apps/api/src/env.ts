// Central boot-time validation for environment variables. Importing this
// module (main.ts does, first thing) both re-exports JWT_SECRET (which
// fails on its own if missing/weak — see ./auth/jwt-secret) and validates
// everything else with no safe fallback: DATABASE_URL and
// BLOB_READ_WRITE_TOKEN are load-bearing for basically every request, so a
// missing value should stop the process at boot with a clear message
// instead of surfacing as a confusing failure on the first real request.
//
// Deliberately NOT enforced here: LIVEKIT_*, ANTHROPIC_API_KEY,
// GIPHY_API_KEY, ROUTESTACK_*, ADMIN_API_KEY. These are optional
// integrations that already degrade gracefully at their call sites (a
// clear 400 for AI/GIF requests, self-hosted-dev LiveKit credentials, a
// clear 401 naming the missing var for the admin surface) — refusing to
// boot without them would break every dev who only needs the core app.
//
// IMPORTANT: dotenv.config() MUST be called here, before the JWT_SECRET
// import below, because jwt-secret.ts reads process.env at module-load
// time (before NestJS bootstrapping runs). Without this call the .env
// file is never parsed and the app always throws at startup.
import * as dotenv from 'dotenv';
import * as path from 'path';

const envDir = path.resolve(__dirname, '..');
// dotenv never overrides a key that's already set in process.env, so this
// layers cleanly: real env vars injected by the host (Railway/Fly/etc.)
// always win, then .env.production fills in anything still missing (e.g.
// LiveKit Cloud creds), then .env fills in the rest (dev-only fallbacks
// like self-hosted LiveKit's devkey/secret never apply in production
// because .env.production already claimed those keys first).
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.join(envDir, '.env.production') });
}
dotenv.config({ path: path.join(envDir, '.env') });
import { JWT_SECRET } from './auth/jwt-secret';

const REQUIRED = ['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN'] as const;

const OPTIONAL_FEATURES: Record<string, string> = {
  ANTHROPIC_API_KEY: 'the AI companion will be unavailable',
  GIPHY_API_KEY: 'the GIF picker will be unavailable',
  LIVEKIT_API_KEY: 'Live/calls will run on insecure self-hosted-dev LiveKit credentials',
  ROUTESTACK_API_KEY: 'AI-agent travel search will be unavailable',
  ADMIN_API_KEY: 'the admin ops dashboard will be unreachable',
  INTEGRATIONS_ENCRYPTION_KEY: 'connecting Google Calendar/GitHub/Slack/YouTube/TikTok/X/LinkedIn/Facebook/Telegram/WhatsApp will be unavailable',
  GOOGLE_CALENDAR_CLIENT_ID: 'connecting Google Calendar will be unavailable',
  GITHUB_CLIENT_ID: 'connecting GitHub will be unavailable',
  SLACK_CLIENT_ID: 'connecting Slack will be unavailable',
  // Phase 5 connector scaffolding (apps/api/src/integrations/oauth-providers.ts
  // + adapters/) — real OAuth2 config/adapter code exists for all 4 of these,
  // but Guranda has no real developer app registered with any of them yet,
  // so they're unset here on purpose. Each one only lights up (isConfigured:
  // true on GET /connectors, "Connect" enabled in the app) once someone adds
  // the real client id/secret to Render — no code changes needed at that point.
  YOUTUBE_CLIENT_ID: 'connecting YouTube will be unavailable — get one at https://console.cloud.google.com/apis/credentials (enable the YouTube Data API v3)',
  TIKTOK_CLIENT_ID: 'connecting TikTok will be unavailable — get one at https://developers.tiktok.com/',
  X_CLIENT_ID: 'connecting X (Twitter) will be unavailable — get one at https://developer.x.com/en/portal/dashboard',
  LINKEDIN_CLIENT_ID: 'connecting LinkedIn will be unavailable — get one at https://www.linkedin.com/developers/apps',
  // Facebook Login (Meta Graph API) — same posture as the 5 above: real
  // OAuth2 config/code exists (apps/api/src/integrations/oauth-providers.ts),
  // but Guranda has no real Meta developer app registered yet.
  FACEBOOK_CLIENT_ID: 'connecting Facebook will be unavailable — get one at https://developers.facebook.com/apps/ (create an app, add the "Facebook Login" product)',
  // Telegram and WhatsApp are NOT OAuth2 (see adapters/telegram.adapter.ts
  // and adapters/whatsapp.adapter.ts) so there's no TELEGRAM_CLIENT_ID or
  // WHATSAPP_CLIENT_ID here — each user supplies their own credentials
  // directly: a Telegram bot token from @BotFather (send it /newbot), or a
  // WhatsApp system-user access token + phone_number_id from Meta Business
  // Manager (business.facebook.com) — and pastes them into Guranda
  // directly. Nothing to configure at the app level for either.
};

function validateEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Set them in apps/api/.env before starting the API.',
    );
  }
  for (const [key, consequence] of Object.entries(OPTIONAL_FEATURES)) {
    if (!process.env[key]) {
      console.warn(`[env] ${key} is not set — ${consequence}.`);
    }
  }
}

validateEnv();

export { JWT_SECRET };
