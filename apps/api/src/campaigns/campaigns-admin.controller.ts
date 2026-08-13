import { Body, Controller, Get, Param, Post, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

// Mirrors ChallengesAdminController exactly: AdminAccessGuard (x-admin-key
// header or role:'ADMIN' JWT) + an audit log entry on every write.
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AdminAccessGuard)
@Controller('admin/campaigns')
export class CampaignsAdminController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  list() {
    return this.campaigns.adminList();
  }

  @Post('platform-update')
  async createPlatformUpdate(@Body() body: CreateCampaignDto, @Request() req: any) {
    const campaign = await this.campaigns.adminCreatePlatformUpdate(req.admin.adminId, body);
    await this.audit.log(req.admin, 'campaign.create-platform-update', { type: 'Campaign', id: campaign.id }, body as any);
    return campaign;
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    const campaign = await this.campaigns.approve(id);
    await this.audit.log(req.admin, 'campaign.approve', { type: 'Campaign', id });
    return campaign;
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Request() req: any) {
    const campaign = await this.campaigns.reject(id);
    await this.audit.log(req.admin, 'campaign.reject', { type: 'Campaign', id });
    return campaign;
  }
}
