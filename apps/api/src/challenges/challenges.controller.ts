import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get()
  list(@Query('category') category?: string, @Query('type') type?: string) {
    return this.challenges.listActive(category, type);
  }

  @Get(':id')
  detail(@Param('id') id: string, @Request() req: any) {
    return this.challenges.getDetail(id, req.user.userId);
  }

  @Post(':id/entries')
  submitEntry(
    @Param('id') id: string,
    @Body() body: { mediaUrl: string; mediaType: string; caption?: string },
    @Request() req: any,
  ) {
    return this.challenges.submitEntry(req.user.userId, id, body);
  }

  @Get('entries/:entryId/comments')
  entryComments(@Param('entryId') entryId: string) {
    return this.challenges.getEntryComments(entryId);
  }

  @Post('entries/:entryId/like')
  likeEntry(@Param('entryId') entryId: string, @Request() req: any) {
    return this.challenges.likeEntry(req.user.userId, entryId);
  }

  @Post('entries/:entryId/vote')
  voteEntry(@Param('entryId') entryId: string, @Body('value') value: number, @Request() req: any) {
    return this.challenges.voteEntry(req.user.userId, entryId, value);
  }

  @Post('entries/:entryId/comments')
  commentOnEntry(@Param('entryId') entryId: string, @Body('content') content: string, @Request() req: any) {
    return this.challenges.commentOnEntry(req.user.userId, entryId, content);
  }
}
