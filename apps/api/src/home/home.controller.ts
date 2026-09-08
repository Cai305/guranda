import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { HomeService } from './home.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AdminAccessGuard } from '../admin/admin-access.guard';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @UseGuards(JwtAuthGuard)
  @Get('briefing')
  async getBriefing(@Request() req: any) {
    return this.homeService.getBriefing(req.user.userId);
  }

  // n8n's scheduled pre-computation call — same x-admin-key convention as
  // every other server-to-server endpoint (see AdminAccessGuard).
  @UseGuards(AdminAccessGuard)
  @Post('briefing/refresh-all')
  async refreshAll() {
    return this.homeService.refreshAllActive();
  }
}
