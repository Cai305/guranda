import { Module } from '@nestjs/common';
import { MentionsService } from './mentions.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [MentionsService, PrismaService],
  exports: [MentionsService],
})
export class MentionsModule {}
