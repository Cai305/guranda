import { Module } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { PrismaService } from '../prisma.service';
import { CommunitiesAiToolsProvider } from './communities-ai-tools.provider';

@Module({
  controllers: [CommunitiesController],
  providers: [CommunitiesService, PrismaService, CommunitiesAiToolsProvider],
})
export class CommunitiesModule {}
