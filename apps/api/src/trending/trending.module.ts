import { Module } from '@nestjs/common';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { PostsModule } from '../posts/posts.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { LiveModule } from '../live/live.module';

@Module({
  imports: [PostsModule, ChallengesModule, LiveModule],
  controllers: [TrendingController],
  providers: [TrendingService],
})
export class TrendingModule {}
