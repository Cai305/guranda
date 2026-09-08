import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { TrendingService } from './trending.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  async getTrending(@Request() req: any) {
    return this.trendingService.getTrendingFeed(req.user.userId);
  }
}
