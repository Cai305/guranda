import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConnectorAuthType, ConnectorCategory } from '@prisma/client';
import { isProviderConfigured, IntegrationProvider } from '../integrations/oauth-providers';
import { isEncryptionConfigured } from '../common/crypto.util';

interface ConnectorSeed {
  key: string;
  displayName: string;
  category: ConnectorCategory;
  authType: ConnectorAuthType;
  docsUrl: string | null;
  /** Set for the OAuth2 providers integrations.module.ts actually wires up (see oauth-providers.ts) — isConfigured is computed live from real env vars for these. */
  realProviderKey?: IntegrationProvider;
  /** Escape hatch for providers whose real "is this ready" check isn't the generic client-id/secret env check above — currently just telegram (bot-token model, gated on encryption being configured, not an app-level credential — see adapters/telegram.adapter.ts). Hardcoded false for anything with neither this nor realProviderKey set. */
  computeConfigured?: () => boolean;
}

// Phase 5 gave real adapter code to 5 of these (telegram, youtube, tiktok,
// x, linkedin — see apps/api/src/integrations/{oauth-providers.ts,
// adapters/}) so the moment real credentials exist for one, it lights up
// with zero further code changes. Uber/Bolt/inDrive remain un-adapted —
// out of scope for this phase. isConfigured is still computed live below
// for every row; nothing here is ever hardcoded to true.
const CONNECTOR_SEEDS: ConnectorSeed[] = [
  { key: 'google_calendar', displayName: 'Google Calendar', category: 'PRODUCTIVITY', authType: 'OAUTH2', docsUrl: 'https://developers.google.com/calendar', realProviderKey: 'google_calendar' },
  { key: 'github', displayName: 'GitHub', category: 'PRODUCTIVITY', authType: 'OAUTH2', docsUrl: 'https://docs.github.com/en/apps/oauth-apps', realProviderKey: 'github' },
  { key: 'slack', displayName: 'Slack', category: 'MESSAGING', authType: 'OAUTH2', docsUrl: 'https://api.slack.com/authentication/oauth-v2', realProviderKey: 'slack' },
  { key: 'telegram', displayName: 'Telegram', category: 'MESSAGING', authType: 'API_KEY', docsUrl: 'https://core.telegram.org/bots/api', computeConfigured: () => isEncryptionConfigured() },
  { key: 'youtube', displayName: 'YouTube', category: 'MEDIA', authType: 'OAUTH2', docsUrl: 'https://developers.google.com/youtube/v3', realProviderKey: 'youtube' },
  { key: 'tiktok', displayName: 'TikTok', category: 'MEDIA', authType: 'OAUTH2', docsUrl: 'https://developers.tiktok.com/', realProviderKey: 'tiktok' },
  { key: 'x', displayName: 'X (Twitter)', category: 'SOCIAL', authType: 'OAUTH2', docsUrl: 'https://developer.twitter.com/en/docs/twitter-api', realProviderKey: 'x' },
  { key: 'linkedin', displayName: 'LinkedIn', category: 'SOCIAL', authType: 'OAUTH2', docsUrl: 'https://learn.microsoft.com/en-us/linkedin/', realProviderKey: 'linkedin' },
  { key: 'facebook', displayName: 'Facebook', category: 'SOCIAL', authType: 'OAUTH2', docsUrl: 'https://developers.facebook.com/docs/facebook-login', realProviderKey: 'facebook' },
  // WhatsApp Business Platform (Meta Cloud API): a system-user access token
  // + phone_number_id pasted in directly, not OAuth2 — same posture as
  // telegram above (gated on isEncryptionConfigured(), not an app-level
  // credential; see adapters/whatsapp.adapter.ts).
  { key: 'whatsapp', displayName: 'WhatsApp', category: 'MESSAGING', authType: 'API_KEY', docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api', computeConfigured: () => isEncryptionConfigured() },
  { key: 'uber', displayName: 'Uber', category: 'RIDE', authType: 'OAUTH2', docsUrl: 'https://developer.uber.com/' },
  { key: 'bolt', displayName: 'Bolt', category: 'RIDE', authType: 'API_KEY', docsUrl: null },
  { key: 'indrive', displayName: 'inDrive', category: 'RIDE', authType: 'API_KEY', docsUrl: null },
];

// Seeds/refreshes the ConnectorProvider table on every boot so isConfigured
// always reflects real env-var presence (see oauth-providers.ts) instead of
// going stale between deploys — a credential added to Render today shows up
// as configured on the next boot with no manual seed step.
@Injectable()
export class ConnectorsService implements OnModuleInit {
  private readonly logger = new Logger(ConnectorsService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.reseed();
  }

  private async reseed() {
    for (const seed of CONNECTOR_SEEDS) {
      const isConfigured = seed.computeConfigured
        ? seed.computeConfigured()
        : seed.realProviderKey
          ? isProviderConfigured(seed.realProviderKey)
          : false;
      await this.prisma.connectorProvider.upsert({
        where: { key: seed.key },
        create: {
          key: seed.key,
          displayName: seed.displayName,
          category: seed.category,
          authType: seed.authType,
          docsUrl: seed.docsUrl,
          isConfigured,
        },
        update: {
          displayName: seed.displayName,
          category: seed.category,
          authType: seed.authType,
          docsUrl: seed.docsUrl,
          isConfigured,
        },
      });
    }
    this.logger.log(`Seeded/refreshed ${CONNECTOR_SEEDS.length} ConnectorProvider rows`);
  }

  async list() {
    return this.prisma.connectorProvider.findMany({
      orderBy: [{ category: 'asc' }, { displayName: 'asc' }],
    });
  }
}
