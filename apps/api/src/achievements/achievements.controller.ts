import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AchievementsService } from './achievements.service';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  async listAll() {
    return this.achievements.listAll();
  }

  @Get('mine')
  async listMine(@Request() req: any) {
    return this.achievements.listMine(req.user.userId);
  }
}
