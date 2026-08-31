import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
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
    assertValidProvider(provider);
    await this.integrations.disconnect((req as any).user.userId, provider);
    return { disconnected: true };
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
