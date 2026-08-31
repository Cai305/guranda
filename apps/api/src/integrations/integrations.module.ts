import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma.service';
import { JWT_SECRET } from '../auth/jwt-secret';
import { GoogleCalendarAiToolsProvider } from './google-calendar-ai-tools.provider';
import { GithubAiToolsProvider } from './github-ai-tools.provider';
import { SlackAiToolsProvider } from './slack-ai-tools.provider';

@Module({
  // A dedicated JwtModule registration (same JWT_SECRET as AuthModule, not
  // imported from it) — only used here to sign/verify the short-lived OAuth
  // `state` value, kept independent so this module doesn't reach into auth
  // internals for an unrelated purpose.
  imports: [JwtModule.register({ secret: JWT_SECRET })],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    PrismaService,
    GoogleCalendarAiToolsProvider,
    GithubAiToolsProvider,
    SlackAiToolsProvider,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
