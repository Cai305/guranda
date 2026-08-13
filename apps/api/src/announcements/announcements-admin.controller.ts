import { Body, Controller, Post, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AdminAccessGuard)
@Controller('admin/announcements')
export class AnnouncementsAdminController {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Post()
  async create(@Body() body: CreateAnnouncementDto, @Request() req: any) {
    const announcement = await this.announcements.createByAdmin(req.admin.adminId, body);
    await this.audit.log(req.admin, 'announcement.create', { type: 'Announcement', id: announcement.id }, body as any);
    return announcement;
  }
}
