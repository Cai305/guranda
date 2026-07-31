import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('games')
  games(@Request() req: any) {
    return this.activityService.gamesSummary(req.user.userId);
  }
}
