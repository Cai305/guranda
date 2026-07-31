import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma.service';
import { ActivityAiToolsProvider } from './activity-ai-tools.provider';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, PrismaService, ActivityAiToolsProvider],
})
export class ActivityModule {}
