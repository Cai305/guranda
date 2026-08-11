import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengeSponsorshipService } from './challenge-sponsorship.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { SubmitEntryDto } from './dto/submit-entry.dto';
import { VoteDto } from './dto/vote.dto';
import { CommentDto } from './dto/comment.dto';
import { ProposeSponsorshipDto } from './dto/propose-sponsorship.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly challenges: ChallengesService,
    private readonly sponsorships: ChallengeSponsorshipService,
  ) {}

  @Get('sponsorships/eligibility')
  sponsorshipEligibility(@Request() req: any) {
    return this.sponsorships.checkEligibility(req.user.userId);
  }

  @Post('sponsorships')
  proposeSponsorship(@Body() body: ProposeSponsorshipDto, @Request() req: any) {
    return this.sponsorships.proposeSponsorship(req.user.userId, body);
  }

  @Get()
  list(
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.challenges.listActive(category, type, toPositiveInt(take, 20), toPositiveInt(skip, 0));
  }

  // Must come before ':id' routes so Nest doesn't treat 'entries' as an id.
  @Get('entries/feed')
  entriesFeed(
    @Request() req: any,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('scope') scope?: string,
  ) {
    return this.challenges.getEntriesFeed(
      req.user.userId,
      toPositiveInt(take, 15),
      cursor,
      search,
      category,
      scope,
    );
  }

  @Get('entries/:entryId/stats')
  entryStats(@Param('entryId') entryId: string) {
    return this.challenges.getEntryStats(entryId);
  }

  @Post('entries/:commentId/boost')
  boostComment(
    @Param('commentId') commentId: string,
    @Body() body: { mshAmount: number },
    @Request() req: any,
  ) {
    return this.challenges.boostComment(req.user.userId, commentId, body.mshAmount);
  }

  @Get(':id')
  detail(
    @Param('id') id: string,
    @Request() req: any,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.challenges.getDetail(id, req.user.userId, toPositiveInt(take, 30), toPositiveInt(skip, 0));
  }

  @Post(':id/entries')
  submitEntry(@Param('id') id: string, @Body() body: SubmitEntryDto, @Request() req: any) {
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
  voteEntry(@Param('entryId') entryId: string, @Body() body: VoteDto, @Request() req: any) {
    return this.challenges.voteEntry(req.user.userId, entryId, body.value);
  }

  @Post('entries/:entryId/comments')
  commentOnEntry(@Param('entryId') entryId: string, @Body() body: CommentDto, @Request() req: any) {
    return this.challenges.commentOnEntry(req.user.userId, entryId, body.content);
  }
}

// Query params arrive as strings (or are absent) — clamps to a sane
// positive integer instead of letting a bad/missing value (NaN, negative,
// absurdly large) reach the Prisma take/skip args.
function toPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return fallback;
  return Math.min(n, 100);
}
