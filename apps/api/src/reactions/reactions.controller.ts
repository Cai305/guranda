import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

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
