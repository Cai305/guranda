import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get('feed')
  getFeed(@Request() req: any) {
    return this.opportunities.getFeed(req.user.userId);
  }
}
