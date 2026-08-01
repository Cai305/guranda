import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';

// Admin-curated challenge creation/publishing — mirrors
// AdminFeatureFlagsController / verification.controller.ts: AdminAccessGuard
// (x-admin-key header or role:'ADMIN' JWT) + an audit log entry on every
// write.
@UseGuards(AdminAccessGuard)
@Controller('admin/challenges')
export class ChallengesAdminController {
  constructor(
    private readonly challenges: ChallengesService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  list() {
    return this.challenges.adminList();
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const challenge = await this.challenges.adminCreate(req.admin.adminId, body);
    await this.audit.log(req.admin, 'challenge.create', { type: 'Challenge', id: challenge.id }, body);
    return challenge;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const challenge = await this.challenges.adminUpdate(id, body);
    await this.audit.log(req.admin, 'challenge.update', { type: 'Challenge', id }, body);
    return challenge;
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @Request() req: any) {
    const challenge = await this.challenges.adminPublish(id);
    await this.audit.log(req.admin, 'challenge.publish', { type: 'Challenge', id });
    return challenge;
  }

  @Post(':id/end')
  async end(@Param('id') id: string, @Request() req: any) {
    const challenge = await this.challenges.adminEnd(id);
    await this.audit.log(req.admin, 'challenge.end', { type: 'Challenge', id });
    return challenge;
  }
}
