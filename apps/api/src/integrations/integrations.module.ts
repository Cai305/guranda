import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { JWT_SECRET } from '../auth/jwt-secret';
import { GoogleCalendarAiToolsProvider } from './google-calendar-ai-tools.provider';
import { GithubAiToolsProvider } from './github-ai-tools.provider';
import { SlackAiToolsProvider } from './slack-ai-tools.provider';
import { TelegramAiToolsProvider } from './telegram-ai-tools.provider';
import { TelegramPollService } from './telegram-poll.service';
import { YoutubeAiToolsProvider } from './youtube-ai-tools.provider';
import { TiktokAiToolsProvider } from './tiktok-ai-tools.provider';
import { XAiToolsProvider } from './x-ai-tools.provider';
import { LinkedinAiToolsProvider } from './linkedin-ai-tools.provider';
import { FacebookAiToolsProvider } from './facebook-ai-tools.provider';
import { WhatsappAiToolsProvider } from './whatsapp-ai-tools.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  // A dedicated JwtModule registration (same JWT_SECRET as AuthModule, not
  // imported from it) — only used here to sign/verify the short-lived OAuth
  // `state` value, kept independent so this module doesn't reach into auth
  // internals for an unrelated purpose.
  // NotificationsModule: TelegramPollService writes real Notification rows
  // for newly-received Telegram messages (see telegram-poll.service.ts).
  imports: [JwtModule.register({ secret: JWT_SECRET }), NotificationsModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    GoogleCalendarAiToolsProvider,
    GithubAiToolsProvider,
    SlackAiToolsProvider,
    TelegramAiToolsProvider,
    TelegramPollService,
    YoutubeAiToolsProvider,
    TiktokAiToolsProvider,
    XAiToolsProvider,
    LinkedinAiToolsProvider,
    FacebookAiToolsProvider,
    WhatsappAiToolsProvider,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
