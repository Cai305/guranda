import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengeSponsorshipService } from './challenge-sponsorship.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { ModerateEntryDto } from './dto/moderate-entry.dto';
import { GenerateChallengesDto } from './dto/generate-challenges.dto';

// Admin-curated challenge creation/publishing — mirrors
// AdminFeatureFlagsController / verification.controller.ts: AdminAccessGuard
// (x-admin-key header or role:'ADMIN' JWT) + an audit log entry on every
// write.
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AdminAccessGuard)
@Controller('admin/challenges')
export class ChallengesAdminController {
  constructor(
    private readonly challenges: ChallengesService,
    private readonly sponsorships: ChallengeSponsorshipService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('sponsorships')
  listSponsorships() {
    return this.sponsorships.adminList();
  }

  @Post('sponsorships/:id/approve')
  async approveSponsorship(@Param('id') id: string, @Request() req: any) {
    const sponsorship = await this.sponsorships.approve(id);
    await this.audit.log(req.admin, 'challenge-sponsorship.approve', { type: 'ChallengeSponsorship', id });
    return sponsorship;
  }

  @Post('sponsorships/:id/reject')
  async rejectSponsorship(@Param('id') id: string, @Request() req: any) {
    const sponsorship = await this.sponsorships.reject(id);
    await this.audit.log(req.admin, 'challenge-sponsorship.reject', { type: 'ChallengeSponsorship', id });
    return sponsorship;
  }

  @Get()
  list() {
    return this.challenges.adminList();
  }

  @Post()
  async create(@Body() body: CreateChallengeDto, @Request() req: any) {
    const challenge = await this.challenges.adminCreate(req.admin.adminId, body);
    await this.audit.log(req.admin, 'challenge.create', { type: 'Challenge', id: challenge.id }, body as any);
    return challenge;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateChallengeDto, @Request() req: any) {
    const challenge = await this.challenges.adminUpdate(id, body);
    await this.audit.log(req.admin, 'challenge.update', { type: 'Challenge', id }, body as any);
    return challenge;
  }

  // AI-generated proposals land as DRAFT just like a manually-authored
  // challenge — this only proposes content for an admin to review/edit/
  // publish, it never goes live on its own.
  @Post('generate')
  async generate(@Body() body: GenerateChallengesDto, @Request() req: any) {
    const created = await this.challenges.generateBatch(req.admin.adminId, body.count, body.categories as any);
    await this.audit.log(req.admin, 'challenge.generate', undefined, { count: created.length, requested: body });
    return created;
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

  // Soft-moderation — sets the entry's status rather than hard-deleting it,
  // so a removed entry disappears from getDetail() (already filters
  // status:'PUBLISHED') while the row stays for audit/appeal.
  @Patch('entries/:entryId/moderate')
  async moderateEntry(@Param('entryId') entryId: string, @Body() body: ModerateEntryDto, @Request() req: any) {
    const entry = await this.challenges.moderateEntry(entryId, body.status);
    await this.audit.log(req.admin, 'challenge-entry.moderate', { type: 'ChallengeEntry', id: entryId }, { status: body.status });
    return entry;
  }
}
