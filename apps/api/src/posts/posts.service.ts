import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ContentRankingService,
  ReputationLevel,
} from '../ranking/content-ranking.service';

// Author fields safe to return to any client. Was previously fetched via
// `include: { author: { include: { profile: true } } }`, which returns the
// FULL User row — passwordHash, phoneNumber, etc. — to every caller of the
// feed/comments/create endpoints. `select` instead of `include` keeps only
// what a post card actually needs.
const AUTHOR_SELECT = {
  id: true,
  username: true,
  profile: {
    select: { displayName: true, avatarUrl: true, bio: true, statusMessage: true },
  },
  activeUsername: { select: { reputationScore: true, level: true } },
  verification: { select: { status: true } },
} as const;

// Feed-only select — same as AUTHOR_SELECT plus location, needed for the
// ranking service's geo-proximity scoring but stripped back out by
// toPostAuthor() before the post ever reaches a client response.
const FEED_AUTHOR_SELECT = {
  ...AUTHOR_SELECT,
  locationLat: true,
  locationLng: true,
} as const;

function toPostAuthor(author: any) {
  if (!author) return author;
  const { verification, locationLat, locationLng, ...rest } = author;
  return { ...rest, verified: verification?.status === 'VERIFIED' };
}

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private ranking: ContentRankingService,
  ) {}

  async createPost(
    userId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: string,
  ) {
    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        content,
        mediaUrl,
        mediaType,
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
    return { ...post, author: toPostAuthor(post.author) };
  }

  // Shared by both feed variants — resolves the viewer's private bookmark
  // state and per-author follow state, and normalizes author shape, without
  // leaking who else bookmarked each post.
  private async hydrate(posts: any[], viewerId?: string) {
    const [bookmarkedIds, followedAuthorIds] = await Promise.all([
      viewerId
        ? this.prisma.postBookmark
            .findMany({
              where: { userId: viewerId, postId: { in: posts.map((p) => p.id) } },
              select: { postId: true },
            })
            .then((rows) => new Set(rows.map((b) => b.postId)))
        : new Set<string>(),
      viewerId
        ? this.prisma.follow
            .findMany({
              where: {
                followerId: viewerId,
                followingId: { in: [...new Set(posts.map((p) => p.authorId))] },
              },
              select: { followingId: true },
            })
            .then((rows) => new Set(rows.map((f) => f.followingId)))
        : new Set<string>(),
    ]);

    return posts.map((p) => ({
      ...p,
      author: { ...toPostAuthor(p.author), isFollowedByMe: followedAuthorIds.has(p.authorId) },
      comments: p.comments.map((c: any) => ({ ...c, author: toPostAuthor(c.author) })),
      isBookmarkedByMe: bookmarkedIds.has(p.id),
    }));
  }

  async getFeed(viewerId?: string) {
    // Widen the raw pool beyond what's actually shown — ranking needs
    // candidates to reorder, not just the newest 50.
    const [posts, viewer] = await Promise.all([
      this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: FEED_AUTHOR_SELECT },
          likes: true,
          reposts: true,
          comments: {
            include: { author: { select: AUTHOR_SELECT } },
            orderBy: { createdAt: 'asc' },
          },
        },
        take: 200,
      }),
      viewerId
        ? this.prisma.user.findUnique({
            where: { id: viewerId },
            select: { locationLat: true, locationLng: true },
          })
        : null,
    ]);

    const ranked = this.ranking.rank(
      posts,
      (p) =>
        this.ranking.scoreItem({
          createdAt: p.createdAt,
          authorReputationScore: p.author.activeUsername?.reputationScore ?? 0,
          authorLevel:
            (p.author.activeUsername?.level as ReputationLevel) ?? 'Nano',
          authorLat: p.author.locationLat,
          authorLng: p.author.locationLng,
          viewerLat: viewer?.locationLat,
          viewerLng: viewer?.locationLng,
        }),
      50,
    );

    return this.hydrate(ranked, viewerId);
  }

  // Following tab — plain reverse-chronological, not the "For You" ranking
  // algorithm, matching the reference feed's distinction between the two.
  async getFollowingFeed(viewerId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    if (!follows.length) return [];

    const posts = await this.prisma.post.findMany({
      where: { authorId: { in: follows.map((f) => f.followingId) } },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: true,
        reposts: true,
        comments: {
          include: { author: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: 100,
    });

    return this.hydrate(posts, viewerId);
  }

  // Impression counter — called once per client-side render (debounced by
  // viewport visibility on the client), not per-fetch. Not a unique-viewer
  // count, same convention as view counts elsewhere in the app (Video.views).
  async recordView(postId: string) {
    await this.prisma.post.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
    });
    return { status: 'ok' };
  }

  async getMyStats(userId: string) {
    const [postCount, likesReceived, commentsReceived] = await Promise.all([
      this.prisma.post.count({ where: { authorId: userId } }),
      this.prisma.postLike.count({ where: { post: { authorId: userId } } }),
      this.prisma.comment.count({ where: { post: { authorId: userId } } }),
    ]);
    return { postCount, likesReceived, commentsReceived };
  }

  async likePost(userId: string, postId: string) {
    try {
      await this.prisma.postLike.create({
        data: { userId, postId },
      });
      return { status: 'liked' };
    } catch {
      await this.prisma.postLike.delete({
        where: { postId_userId: { postId, userId } },
      });
      return { status: 'unliked' };
    }
  }

  async repostPost(userId: string, postId: string) {
    try {
      await this.prisma.postRepost.create({
        data: { userId, postId },
      });
      return { status: 'reposted' };
    } catch {
      await this.prisma.postRepost.delete({
        where: { postId_userId: { postId, userId } },
      });
      return { status: 'unreposted' };
    }
  }

  async bookmarkPost(userId: string, postId: string) {
    try {
      await this.prisma.postBookmark.create({
        data: { userId, postId },
      });
      return { status: 'bookmarked' };
    } catch {
      await this.prisma.postBookmark.delete({
        where: { postId_userId: { postId, userId } },
      });
      return { status: 'unbookmarked' };
    }
  }

  async addComment(userId: string, postId: string, content: string) {
    const comment = await this.prisma.comment.create({
      data: { authorId: userId, postId, content },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return { ...comment, author: toPostAuthor(comment.author) };
  }
}
