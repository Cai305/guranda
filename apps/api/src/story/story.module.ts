import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { StoryAiToolsProvider } from './story-ai-tools.provider';
import { FriendsModule } from '../friends/friends.module';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [FriendsModule, SongsModule],
  controllers: [StoryController],
  providers: [StoryService, StoryAiToolsProvider],
  exports: [StoryService],
})
export class StoryModule {}
