import { Module } from '@nestjs/common';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService, PrismaService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
