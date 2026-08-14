import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { PrismaService } from '../prisma.service';
import { StoryAiToolsProvider } from './story-ai-tools.provider';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [FriendsModule],
  controllers: [StoryController],
  providers: [StoryService, PrismaService, StoryAiToolsProvider],
  exports: [StoryService],
})
export class StoryModule {}
