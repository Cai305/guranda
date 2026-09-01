import { Module } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { PrismaService } from '../prisma.service';
import { CommunitiesAiToolsProvider } from './communities-ai-tools.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService, PrismaService, CommunitiesAiToolsProvider],
})
export class CommunitiesModule {}
