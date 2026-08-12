import { Controller, Get, UseGuards } from '@nestjs/common';
import { TrendingService } from './trending.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  async getTrending() {
    return this.trendingService.getTrendingFeed();
  }
}
