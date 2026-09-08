import { Module } from '@nestjs/common';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { PostsModule } from '../posts/posts.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { LiveModule } from '../live/live.module';
import { StoryModule } from '../story/story.module';
import { VideoModule } from '../video/video.module';

@Module({
  imports: [PostsModule, ChallengesModule, LiveModule, StoryModule, VideoModule],
  controllers: [TrendingController],
  providers: [TrendingService],
})
export class TrendingModule {}
