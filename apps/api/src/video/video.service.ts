import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ContentRankingService,
  ReputationLevel,
} from '../ranking/content-ranking.service';
import { VideoTranscodeService } from './video-transcode.service';
import { VideoRewardService } from './video-reward.service';

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private ranking: ContentRankingService,
    private transcode: VideoTranscodeService,
    private reward: VideoRewardService,
  ) {}

  // ── Upload ────────────────────────────────────────────────────────────────
  async createVideo(
    creatorId: string,
    dto: {
      title: string;
      description?: string;
      url: string;
      thumbnailUrl?: string;
      duration: number;
      category: string;
      tags?: string[];
      videoType?: string;
    },
  ) {
    if (dto.duration <= 45)
      throw new BadRequestException('Video must be longer than 45 seconds');
    const video = await this.prisma.video.create({
      data: {
        creatorId,
        title: dto.title,
        description: dto.description,
        url: dto.url,
        thumbnailUrl: dto.thumbnailUrl,
        duration: dto.duration,
        category: dto.category,
        tags: dto.tags ?? [],
        videoType: dto.videoType || 'STANDARD',
        processingStatus: 'processing',
      },
      include: {
        creator: { include: { profile: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    // Fire-and-forget — the HTTP response to the uploader returns immediately,
    // it does not wait for the (multi-second/minute) background transcode.
    this.transcode.enqueue(video.id, video.url);
    return video;
  }

  // watchProgress (seconds into the video, from WatchHistory) for every
  // video this user has ever watched — attached to feed/trending/search
  // results so the client can render a YouTube-style red "watched up to
  // here" bar under the thumbnail. Empty map for a logged-out/new viewer.
  private async getWatchProgressMap(
    userId?: string,
  ): Promise<Record<string, number>> {
    if (!userId) return {};
    const rows = await this.prisma.watchHistory.findMany({
      where: { userId },
      select: { videoId: true, progress: true },
    });
    return Object.fromEntries(rows.map((r) => [r.videoId, r.progress]));
  }

  // ── Feed (personalized) ───────────────────────────────────────────────────
  // Reranks a raw chronological pool by score before slicing to a page, same
  // as posts.service.ts's getFeed — so the pagination cursor has to track
  // the raw pool's boundary, not the reranked page's last item, or a
  // low-scoring-but-recent video could fall into a permanent gap: never
  // shown on this page (score too low) and excluded from the next page's
  // `createdAt < cursor` filter (too recent). See posts.service.ts's getFeed
  // for the full explanation.
  async getFeed(userId: string, take = 20, cursor?: string, category?: string) {
    const pageSize = take > 0 ? Math.min(take, 50) : 20;
    const poolSize = Math.max(pageSize * 4, 50);

    const interests = await this.prisma.userInterest.findMany({
      where: { userId },
    });
    const interestCategories = interests.map((i) => i.category);

    const progressMap = await this.getWatchProgressMap(userId);

    const [videos, viewer] = await Promise.all([
      this.prisma.video.findMany({
        where: {
          ...(category && category !== 'All' ? { category } : {}),
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        include: {
          creator: { include: { profile: true, activeUsername: true } },
          _count: { select: { likes: true, comments: true } },
          reward: { select: { payoutMode: true, amountPerUnit: true, remainingBudgetMsh: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: poolSize,
      }),
      userId
        ? this.prisma.user.findUnique({
            where: { id: userId },
            select: { locationLat: true, locationLng: true },
          })
        : null,
    ]);

    const isLiked = await this.prisma.videoLike.findMany({
      where: { userId },
      select: { videoId: true },
    });
    const likedSet = new Set(isLiked.map((l) => l.videoId));
    const wlEntries = await this.prisma.watchLater.findMany({
      where: { userId },
      select: { videoId: true },
    });
    const wlSet = new Set(wlEntries.map((w) => w.videoId));

    const scored = videos.map((v) => {
      let score = 0;
      if (interestCategories.includes(v.category)) score += 30;
      score += Math.floor(v.views / 100);
      const age = (Date.now() - v.createdAt.getTime()) / 86400000;
      if (age < 7) score += 20;
      if (progressMap[v.id] !== undefined) score -= 5;
      // Reputation+proximity term, additive alongside the existing
      // interest/views/recency signal rather than replacing it — scaled to
      // roughly the same 0-50+ range as the score above.
      score +=
        this.ranking.scoreItem({
          createdAt: v.createdAt,
          authorReputationScore: v.creator.activeUsername?.reputationScore ?? 0,
          authorLevel:
            (v.creator.activeUsername?.level as ReputationLevel) ?? 'Nano',
          authorLat: v.creator.locationLat,
          authorLng: v.creator.locationLng,
          viewerLat: viewer?.locationLat,
          viewerLng: viewer?.locationLng,
        }) * 40;
      return {
        ...v,
        score,
        liked: likedSet.has(v.id),
        savedLater: wlSet.has(v.id),
        watchProgress: progressMap[v.id] ?? 0,
      };
    });

    const nextCursor = videos.length < poolSize ? null : videos[videos.length - 1].createdAt.toISOString();

    return {
      videos: scored.sort((a, b) => b.score - a.score).slice(0, pageSize),
      nextCursor,
    };
  }

  // ── My stats (creator dashboard) ─────────────────────────────────────────
  async getMyStats(userId: string) {
    const [agg, totalLikes, totalComments, myVideoIds] = await Promise.all([
      this.prisma.video.aggregate({
        where: { creatorId: userId },
        _sum: { views: true },
        _count: true,
      }),
      this.prisma.videoLike.count({ where: { video: { creatorId: userId } } }),
      this.prisma.videoComment.count({ where: { video: { creatorId: userId } } }),
      this.prisma.video.findMany({ where: { creatorId: userId }, select: { id: true } }),
    ]);
    // Gift.contextId is a free-form string, not a real FK to Video, so
    // gifts-received has to be resolved as a second query against the
    // creator's own video ids rather than a join.
    const giftAgg = await this.prisma.gift.aggregate({
      where: { context: 'video', contextId: { in: myVideoIds.map((v) => v.id) } },
      _sum: { amount: true },
      _count: true,
    });
    return {
      videoCount: agg._count,
      totalViews: agg._sum.views ?? 0,
      totalLikes,
      totalComments,
      giftsReceived: giftAgg._sum.amount ?? 0,
      giftCount: giftAgg._count,
    };
  }

  // ── Trending ──────────────────────────────────────────────────────────────
  async getTrending(userId?: string) {
    const videos = await this.prisma.video.findMany({
      include: {
        creator: { include: { profile: true } },
        _count: { select: { likes: true, comments: true } },
        reward: { select: { payoutMode: true, amountPerUnit: true, remainingBudgetMsh: true } },
      },
      orderBy: { views: 'desc' },
      take: 30,
    });
    const likedSet = userId
      ? new Set(
          (
            await this.prisma.videoLike.findMany({
              where: { userId },
              select: { videoId: true },
            })
          ).map((l) => l.videoId),
        )
      : new Set<string>();
    const wlSet = userId
      ? new Set(
          (
            await this.prisma.watchLater.findMany({
              where: { userId },
              select: { videoId: true },
            })
          ).map((w) => w.videoId),
        )
      : new Set<string>();
    const progressMap = await this.getWatchProgressMap(userId);
    return videos.map((v) => ({
      ...v,
      liked: likedSet.has(v.id),
      savedLater: wlSet.has(v.id),
      watchProgress: progressMap[v.id] ?? 0,
    }));
  }

  // ── Search ────────────────────────────────────────────────────────────────
  async search(q: string, userId?: string) {
    const lower = q.toLowerCase();
    const videos = await this.prisma.video.findMany({
      where: {
        OR: [
          { title: { contains: lower, mode: 'insensitive' } },
          { description: { contains: lower, mode: 'insensitive' } },
          { category: { contains: lower, mode: 'insensitive' } },
          { tags: { has: lower } },
        ],
      },
      include: {
        creator: { include: { profile: true } },
        _count: { select: { likes: true, comments: true } },
        reward: { select: { payoutMode: true, amountPerUnit: true, remainingBudgetMsh: true } },
      },
      orderBy: { views: 'desc' },
      take: 30,
    });
    const likedSet = userId
      ? new Set(
          (
            await this.prisma.videoLike.findMany({
              where: { userId },
              select: { videoId: true },
            })
          ).map((l) => l.videoId),
        )
      : new Set<string>();
    const progressMap = await this.getWatchProgressMap(userId);
    return videos.map((v) => ({
      ...v,
      liked: likedSet.has(v.id),
      watchProgress: progressMap[v.id] ?? 0,
    }));
  }

  // ── Single video ──────────────────────────────────────────────────────────
  async getVideo(id: string, userId?: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        creator: { include: { profile: true } },
        _count: { select: { likes: true, comments: true } },
        renditions: { orderBy: { width: 'desc' } },
        reward: userId ? { include: { claims: { where: { userId } } } } : true,
      },
    });
    if (!video) throw new NotFoundException('Video not found');
    // Flatten this viewer's own reward ledger row (if any) alongside the
    // reward config, instead of a nested claims[] array with at most one
    // entry — the client only ever cares about "my" progress on this video.
    const rewardWithMyClaim = video.reward
      ? {
          id: video.reward.id,
          payoutMode: video.reward.payoutMode,
          amountPerUnit: video.reward.amountPerUnit,
          totalBudgetMsh: video.reward.totalBudgetMsh,
          remainingBudgetMsh: video.reward.remainingBudgetMsh,
          myEarnedMsh: (video.reward as any).claims?.[0]?.amountPaid ?? 0,
        }
      : null;
    const liked = userId
      ? !!(await this.prisma.videoLike.findUnique({
          where: { videoId_userId: { videoId: id, userId } },
        }))
      : false;
    const savedLater = userId
      ? !!(await this.prisma.watchLater.findUnique({
          where: { userId_videoId: { userId, videoId: id } },
        }))
      : false;
    const [subscribed, subscriberCount] = await Promise.all([
      userId
        ? !!(await this.prisma.creatorSubscription.findUnique({
            where: {
              subscriberId_creatorId: {
                subscriberId: userId,
                creatorId: video.creatorId,
              },
            },
          }))
        : false,
      this.prisma.creatorSubscription.count({
        where: { creatorId: video.creatorId },
      }),
    ]);
    const giftAgg = await this.prisma.gift.aggregate({
      where: { context: 'video', contextId: id },
      _sum: { amount: true },
      _count: true,
    });
    return {
      ...video,
      reward: rewardWithMyClaim,
      liked,
      savedLater,
      subscribed,
      subscriberCount,
      giftTotal: giftAgg._sum.amount ?? 0,
      giftCount: giftAgg._count,
    };
  }

  // ── Watch-to-earn ─────────────────────────────────────────────────────────
  async fundReward(videoId: string, creatorId: string, payoutMode: string, amountPerUnit: number, totalBudgetMsh: number) {
    return this.reward.fundReward(videoId, creatorId, payoutMode, amountPerUnit, totalBudgetMsh);
  }

  // ── View (increment + history) ────────────────────────────────────────────
  async recordView(videoId: string, userId: string, progress: number) {
    await this.prisma.video.update({
      where: { id: videoId },
      data: { views: { increment: 1 } },
    });
    await this.prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: { progress, watchedAt: new Date() },
      create: { userId, videoId, progress },
    });
  }

  // Heartbeat from an in-progress playback session — updates how far the
  // user has watched without re-incrementing the view count (that only
  // happens once, from recordView at playback start).
  async updateWatchProgress(videoId: string, userId: string, progress: number) {
    await this.prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: { progress, watchedAt: new Date() },
      create: { userId, videoId, progress },
    });
    // Fire-and-forget — a watch-to-earn payout is a side effect of a real
    // heartbeat, never something the progress-save request should wait on
    // or fail because of.
    this.reward.processHeartbeat(videoId, userId, progress).catch(() => {});
  }

  // ── Likes ─────────────────────────────────────────────────────────────────
  async likeVideo(videoId: string, userId: string) {
    await this.prisma.videoLike.upsert({
      where: { videoId_userId: { videoId, userId } },
      update: {},
      create: { videoId, userId },
    });
    return { liked: true };
  }

  async unlikeVideo(videoId: string, userId: string) {
    await this.prisma.videoLike.deleteMany({ where: { videoId, userId } });
    return { liked: false };
  }

  // ── Creator subscriptions ────────────────────────────────────────────────
  async subscribeToCreator(subscriberId: string, creatorId: string) {
    if (subscriberId === creatorId) {
      throw new BadRequestException('You cannot subscribe to yourself');
    }
    await this.prisma.creatorSubscription.upsert({
      where: { subscriberId_creatorId: { subscriberId, creatorId } },
      update: {},
      create: { subscriberId, creatorId },
    });
    const subscriberCount = await this.prisma.creatorSubscription.count({
      where: { creatorId },
    });
    return { subscribed: true, subscriberCount };
  }

  async unsubscribeFromCreator(subscriberId: string, creatorId: string) {
    await this.prisma.creatorSubscription.deleteMany({
      where: { subscriberId, creatorId },
    });
    const subscriberCount = await this.prisma.creatorSubscription.count({
      where: { creatorId },
    });
    return { subscribed: false, subscriberCount };
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  async getComments(videoId: string) {
    return this.prisma.videoComment.findMany({
      where: { videoId },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async addComment(videoId: string, userId: string, text: string) {
    return this.prisma.videoComment.create({
      data: { videoId, userId, text },
      include: { user: { include: { profile: true } } },
    });
  }

  // ── Playlists ─────────────────────────────────────────────────────────────
  async getMyPlaylists(userId: string) {
    return this.prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: { select: { videos: true } },
        videos: {
          take: 1,
          include: { video: { select: { thumbnailUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPlaylist(userId: string, name: string, isPublic = true) {
    return this.prisma.playlist.create({ data: { userId, name, isPublic } });
  }

  async getPlaylist(id: string, userId?: string) {
    const pl = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        videos: {
          include: {
            video: {
              include: {
                creator: { include: { profile: true } },
                _count: { select: { likes: true } },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        user: { include: { profile: true } },
      },
    });
    if (!pl) throw new NotFoundException('Playlist not found');
    const progressMap = await this.getWatchProgressMap(userId);
    return {
      ...pl,
      videos: pl.videos.map((pv) => ({
        ...pv,
        video: { ...pv.video, watchProgress: progressMap[pv.video.id] ?? 0 },
      })),
    };
  }

  async addToPlaylist(playlistId: string, videoId: string, userId: string) {
    const pl = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });
    if (!pl) throw new NotFoundException();
    if (pl.userId !== userId) throw new ForbiddenException();
    const count = await this.prisma.playlistVideo.count({
      where: { playlistId },
    });
    await this.prisma.playlistVideo.upsert({
      where: { playlistId_videoId: { playlistId, videoId } },
      update: {},
      create: { playlistId, videoId, position: count },
    });
    return { added: true };
  }

  async removeFromPlaylist(
    playlistId: string,
    videoId: string,
    userId: string,
  ) {
    const pl = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });
    if (!pl) throw new NotFoundException();
    if (pl.userId !== userId) throw new ForbiddenException();
    await this.prisma.playlistVideo.deleteMany({
      where: { playlistId, videoId },
    });
    return { removed: true };
  }

  async deletePlaylist(id: string, userId: string) {
    const pl = await this.prisma.playlist.findUnique({ where: { id } });
    if (!pl) throw new NotFoundException();
    if (pl.userId !== userId) throw new ForbiddenException();
    await this.prisma.playlist.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Watch Later ───────────────────────────────────────────────────────────
  async getWatchLater(userId: string) {
    const entries = await this.prisma.watchLater.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            creator: { include: { profile: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
    const progressMap = await this.getWatchProgressMap(userId);
    return entries.map((e) => ({
      ...e.video,
      savedLater: true,
      watchProgress: progressMap[e.video.id] ?? 0,
    }));
  }

  async addWatchLater(videoId: string, userId: string) {
    await this.prisma.watchLater.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: {},
      create: { userId, videoId },
    });
    return { saved: true };
  }

  async removeWatchLater(videoId: string, userId: string) {
    await this.prisma.watchLater.deleteMany({ where: { userId, videoId } });
    return { saved: false };
  }

  // ── Interests ─────────────────────────────────────────────────────────────
  async getInterests(userId: string) {
    return this.prisma.userInterest.findMany({ where: { userId } });
  }

  async setInterests(userId: string, categories: string[]) {
    await this.prisma.userInterest.deleteMany({ where: { userId } });
    await this.prisma.userInterest.createMany({
      data: categories.map((c) => ({ userId, category: c })),
      skipDuplicates: true,
    });
    return { updated: true };
  }

  // ── Related videos ────────────────────────────────────────────────────────
  async getRelated(videoId: string, category: string) {
    return this.prisma.video.findMany({
      where: { category, id: { not: videoId } },
      include: {
        creator: { include: { profile: true } },
        _count: { select: { likes: true } },
        renditions: { orderBy: { width: 'desc' } },
        reward: { select: { payoutMode: true, amountPerUnit: true, remainingBudgetMsh: true } },
      },
      orderBy: { views: 'desc' },
      take: 15,
    });
  }
}
