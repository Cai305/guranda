import { Injectable } from '@nestjs/common';
import { PostsService } from '../posts/posts.service';
import { ChallengesService } from '../challenges/challenges.service';
import { LiveService } from '../live/live.service';
import { LiveGateway } from '../live/live.gateway';

// Cross-ecosystem momentum feed: three independently-ranked lists (posts by
// engagement, challenges by recent-entry velocity, live rooms by real
// participant count), not one merged/score-normalized list — the three
// content shapes render as three distinct sections on the client, so there's
// no need to reconcile scores across types.
@Injectable()
export class TrendingService {
  constructor(
    private postsService: PostsService,
    private challengesService: ChallengesService,
    private liveService: LiveService,
    private liveGateway: LiveGateway,
  ) {}

  async getTrendingFeed() {
    const [posts, challenges, liveCandidates] = await Promise.all([
      this.postsService.getTrendingPosts(15),
      this.challengesService.getTrendingChallenges(10),
      this.liveService.getTrendingLive(20),
    ]);

    const live = liveCandidates
      .map((room) => ({
        ...room,
        viewerCount: this.liveGateway.getParticipantCount(room.roomName),
      }))
      .sort((a, b) => b.viewerCount - a.viewerCount)
      .slice(0, 10);

    return { posts, challenges, live };
  }
}
