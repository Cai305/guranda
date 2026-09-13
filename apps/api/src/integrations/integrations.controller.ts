import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { IntegrationsService } from './integrations.service';
import { IntegrationProvider, OAUTH_PROVIDERS } from './oauth-providers';

// Guranda's own custom URI scheme (app.json "scheme": "lifeos") — the OS
// hands this URL back to the mobile app once the system browser finishes
// the OAuth round-trip, closing the loop started by IntegrationsScreen.
const APP_CALLBACK_SCHEME = 'lifeos://integrations/callback';

function assertValidProvider(provider: string): asserts provider is IntegrationProvider {
  if (!(provider in OAUTH_PROVIDERS)) {
    throw new BadRequestException(`Unknown integration provider "${provider}".`);
  }
}

@Controller('integrations')
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: Request) {
    return this.integrations.listForUser((req as any).user.userId);
  }

  // Authenticated: mints a short-lived signed state token (see
  // integrations.service.ts) embedding the user, then returns the full
  // provider authorize URL for the mobile client to open in the system
  // browser. No token/secret is ever sent to the client.
  @UseGuards(JwtAuthGuard)
  @Post(':provider/start')
  async start(@Req() req: Request, @Param('provider') provider: string) {
    assertValidProvider(provider);
    const authorizeUrl = await this.integrations.createAuthorizeUrl(
      (req as any).user.userId,
      provider,
    );
    return { authorizeUrl };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':provider')
  async disconnect(@Req() req: Request, @Param('provider') provider: string) {
    const userId = (req as any).user.userId;
    // Telegram and WhatsApp aren't OAuth2 (see oauth-providers.ts /
    // adapters/telegram.adapter.ts / adapters/whatsapp.adapter.ts) so
    // neither is ever a key in OAUTH_PROVIDERS — assertValidProvider would
    // reject them even though both are perfectly real, disconnectable
    // providers stored in the same ExternalIntegration table.
    if (provider === 'telegram' || provider === 'whatsapp') {
      await this.integrations.disconnect(userId, provider);
      return { disconnected: true };
    }
    assertValidProvider(provider);
    await this.integrations.disconnect(userId, provider);
    return { disconnected: true };
  }

  // Telegram's connect flow: the user pastes a bot token obtained from
  // @BotFather directly (no system-browser redirect, no client id/secret —
  // see adapters/telegram.adapter.ts). This calls Telegram's real getMe
  // endpoint before saving anything, so a bad token fails here with
  // Telegram's own rejection reason rather than saving silently.
  @UseGuards(JwtAuthGuard)
  @Post('telegram/connect')
  async connectTelegram(@Req() req: Request, @Body() body: { botToken?: string }) {
    if (!body?.botToken) {
      throw new BadRequestException('botToken is required.');
    }
    const result = await this.integrations.connectTelegram((req as any).user.userId, body.botToken);
    return { connected: true, username: result.username };
  }

  // WhatsApp's connect flow: the user pastes a permanent system-user access
  // token + phone_number_id obtained directly from Meta Business Manager
  // (no system-browser redirect, no app-level client id/secret — see
  // adapters/whatsapp.adapter.ts). This calls the Cloud API's real
  // phone-number-metadata endpoint before saving anything, so a bad/fake
  // pair fails here with Meta's own rejection reason rather than saving
  // silently.
  @UseGuards(JwtAuthGuard)
  @Post('whatsapp/connect')
  async connectWhatsApp(@Req() req: Request, @Body() body: { accessToken?: string; phoneNumberId?: string }) {
    if (!body?.accessToken || !body?.phoneNumberId) {
      throw new BadRequestException('accessToken and phoneNumberId are both required.');
    }
    const result = await this.integrations.connectWhatsApp(
      (req as any).user.userId,
      body.accessToken,
      body.phoneNumberId,
    );
    return { connected: true, displayPhoneNumber: result.displayPhoneNumber };
  }

  // Live bot identity check (real getMe call) — used by the mobile
  // Connected Apps card's "Verify" action so it can show real, current bot
  // identity rather than only replaying the label saved at connect time.
  @UseGuards(JwtAuthGuard)
  @Get('telegram/me')
  async telegramMe(@Req() req: Request) {
    const identity = await this.integrations.getTelegramIdentity((req as any).user.userId);
    if (!identity) {
      throw new BadRequestException('Telegram is not connected.');
    }
    return identity;
  }

  // On-demand "recent activity" refresh, in addition to the background poll
  // (telegram-poll.service.ts) that turns new messages into real Guranda
  // Notification rows. Read-only against Telegram's own unconfirmed-update
  // queue — never advances the stored offset (see
  // IntegrationsService.getTelegramRecentUpdates).
  @UseGuards(JwtAuthGuard)
  @Get('telegram/updates')
  async telegramUpdates(@Req() req: Request) {
    return this.integrations.getTelegramRecentUpdates((req as any).user.userId);
  }

  // Phase 8: the user picks ONE real chat_id (from their own real
  // getUpdates() results, surfaced in ConnectedAppsScreen's "Recent
  // activity" list) to become the target for the "publish everywhere"
  // fan-out. See IntegrationsService.setTelegramDefaultChatId's doc
  // comment for why this can't be inferred automatically.
  @UseGuards(JwtAuthGuard)
  @Post('telegram/default-chat')
  async setTelegramDefaultChat(@Req() req: Request, @Body() body: { chatId?: number }) {
    if (body?.chatId === undefined || body?.chatId === null) {
      throw new BadRequestException('chatId is required.');
    }
    return this.integrations.setTelegramDefaultChatId((req as any).user.userId, Number(body.chatId));
  }

  // Hit directly by the provider's redirect from the SYSTEM browser, not
  // the app — there is no app JWT on this request. Deliberately no
  // JwtAuthGuard: the user's identity is recovered from the signed `state`
  // minted by start() above, which is the actual security boundary here.
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (!(provider in OAUTH_PROVIDERS)) {
      return res.redirect(
        `${APP_CALLBACK_SCHEME}?status=error&message=${encodeURIComponent('Unknown provider')}`,
      );
    }
    if (error) {
      return res.redirect(
        `${APP_CALLBACK_SCHEME}?provider=${provider}&status=error&message=${encodeURIComponent(error)}`,
      );
    }
    try {
      await this.integrations.handleCallback(provider as IntegrationProvider, code, state);
      return res.redirect(`${APP_CALLBACK_SCHEME}?provider=${provider}&status=success`);
    } catch (e: any) {
      return res.redirect(
        `${APP_CALLBACK_SCHEME}?provider=${provider}&status=error&message=${encodeURIComponent(e.message || 'Connection failed')}`,
      );
    }
  }
}
