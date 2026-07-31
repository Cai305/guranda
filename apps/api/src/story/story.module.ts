import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { PrismaService } from '../prisma.service';
import { StoryAiToolsProvider } from './story-ai-tools.provider';

@Module({
  controllers: [StoryController],
  providers: [StoryService, PrismaService, StoryAiToolsProvider],
})
export class StoryModule {}
