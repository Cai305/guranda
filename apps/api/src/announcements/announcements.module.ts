import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsAdminController } from './announcements-admin.controller';
import { AnnouncementsService } from './announcements.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [AnnouncementsController, AnnouncementsAdminController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
