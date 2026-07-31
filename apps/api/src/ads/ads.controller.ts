import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post('campaigns')
  create(
    @Request() req: any,
    @Body()
    body: { title: string; creativeUrl: string; targetAudience?: string },
  ) {
    return this.adsService.createCampaign(req.user.userId, body);
  }

  @Get('campaigns/mine')
  mine(@Request() req: any) {
    return this.adsService.listMine(req.user.userId);
  }

  @Patch('campaigns/:id/status')
  setStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'PAUSED' | 'ENDED' },
  ) {
    return this.adsService.setStatus(req.user.userId, id, body.status);
  }

  @Get('delivery')
  delivery(@Request() req: any) {
    return this.adsService.getDelivery(req.user.userId);
  }
}
