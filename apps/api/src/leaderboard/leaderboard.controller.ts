import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
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
}
