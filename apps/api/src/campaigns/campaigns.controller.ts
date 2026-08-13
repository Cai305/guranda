import { Body, Controller, Get, Param, Post, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  create(@Body() body: CreateCampaignDto, @Request() req: any) {
    return this.campaigns.create(req.user.userId, body);
  }

  @Get('mine')
  listMine(@Request() req: any) {
    return this.campaigns.listMine(req.user.userId);
  }

  // Must come after 'mine' so Nest doesn't treat 'mine' as an :id.
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.campaigns.getById(id);
  }

  @Post(':id/click')
  trackClick(@Param('id') id: string) {
    return this.campaigns.trackClick(id);
  }

  @Post(':id/complete')
  trackCompletion(@Param('id') id: string) {
    return this.campaigns.trackCompletion(id);
  }

  @Get(':id/analytics')
  analytics(@Param('id') id: string, @Request() req: any) {
    return this.campaigns.getAnalytics(id, req.user.userId);
  }
}
