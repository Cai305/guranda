import { Controller, Get, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { LeaderboardService } from './leaderboard.service';
import { CacheTTL } from '@nestjs/cache-manager';
import { UserCacheInterceptor } from '../common/user-cache.interceptor';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserCacheInterceptor)
@CacheTTL(120_000) // 2 minutes — fresh enough to feel live, saves heavy DB aggregation queries
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get('cards')
  async topByMode(@Query('mode') mode: 'FIVE_CARDS' | 'CASSINO' = 'FIVE_CARDS') {
    return this.leaderboard.topByMode(mode);
  }

  @Get('cards/mine')
  async myRank(@Request() req: any, @Query('mode') mode: 'FIVE_CARDS' | 'CASSINO' = 'FIVE_CARDS') {
    return this.leaderboard.myRank(req.user.userId, mode);
  }

  @Get('challenges')
  async topByChallengeXp(@Query('category') category?: string) {
    return this.leaderboard.topByChallengeXp(category);
  }

  @Get('challenges/mine')
  async myChallengeRank(@Request() req: any, @Query('category') category?: string) {
    return this.leaderboard.myChallengeRank(req.user.userId, category);
  }
}
