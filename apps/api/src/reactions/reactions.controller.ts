import { Controller, Get, Post, Body, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  // The catalog of available reactions is static — cache for 5 minutes to
  // avoid hitting the DB on every session open.
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300_000) // 5 minutes in ms
  @Get('catalog')
  catalog() {
    return this.reactions.catalog();
  }

  @Post()
  react(
    @Request() req: any,
    @Body() body: { recipientId: string; reactionKey: string; context: string; contextId?: string },
  ) {
    return this.reactions.react(
      req.user.userId,
      body.recipientId,
      body.reactionKey,
      body.context,
      body.contextId,
    );
  }
}
