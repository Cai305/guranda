import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DailyChallengesService } from './daily-challenges.service';

@Controller('daily-challenges')
@UseGuards(JwtAuthGuard)
export class DailyChallengesController {
  constructor(private readonly dailyChallenges: DailyChallengesService) {}

  @Get()
  async listToday(@Request() req: any) {
    return this.dailyChallenges.listToday(req.user.userId);
  }

  @Post(':id/claim')
  async claim(@Request() req: any, @Param('id') id: string) {
    return this.dailyChallenges.claimReward(req.user.userId, id);
  }
}
