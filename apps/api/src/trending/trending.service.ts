import { Injectable } from '@nestjs/common';
import { PostsService } from '../posts/posts.service';
import { ChallengesService } from '../challenges/challenges.service';
import { LiveService } from '../live/live.service';
import { LiveGateway } from '../live/live.gateway';
import { StoryService } from '../story/story.service';
import { VideoService } from '../video/video.service';

// Cross-ecosystem momentum feed: independently-ranked lists (posts by
// engagement, challenges by recent-entry velocity, live rooms by real
// participant count, long-form videos by view count, "of the Day" trends by
// label popularity), not one merged/score-normalized list — the content
// shapes render as distinct sections on the client, so there's no need to
// reconcile scores across types.
@Injectable()
export class TrendingService {
  constructor(
    private postsService: PostsService,
    private challengesService: ChallengesService,
    private liveService: LiveService,
    private liveGateway: LiveGateway,
    private storyService: StoryService,
    private videoService: VideoService,
  ) {}

  async getTrendingFeed(userId?: string) {
    const [posts, challenges, liveCandidates, trends, trendLabels, videosPool] = await Promise.all([
      this.postsService.getTrendingPosts(15),
      this.challengesService.getTrendingChallenges(10),
      this.liveService.getTrendingLive(20),
      this.storyService.getLabeledFeed(),
      this.storyService.getTrendingLabels(7),
      this.videoService.getTrending(userId),
    ]);

    const live = liveCandidates
      .map((room) => ({
        ...room,
        viewerCount: this.liveGateway.getParticipantCount(room.roomName),
      }))
      .sort((a, b) => b.viewerCount - a.viewerCount)
      .slice(0, 10);

    const videos = videosPool.slice(0, 10);

    return { posts, challenges, live, videos, trends: trends.slice(0, 15), trendLabels: trendLabels.slice(0, 8) };
  }
}
