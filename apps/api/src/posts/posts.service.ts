import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ContentRankingService,
  ReputationLevel,
} from '../ranking/content-ranking.service';
import { EventBusService } from '../events/event-bus.service';
import { MentionsService, MentionRef } from '../mentions/mentions.service';

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

// Flattens the nested `profile: {displayName, avatarUrl, bio, statusMessage}`
// Prisma include onto the author object — PostAuthor (packages/types) extends
// the flat UserProfile shape, and every mobile screen reads e.g.
// `author.avatarUrl` directly, not `author.profile.avatarUrl`. Without this
// the real photo/bio never reach the client, they just silently fall back to
// a placeholder.
function toPostAuthor(author: any) {
  if (!author) return author;
  const { verification, locationLat, locationLng, profile, ...rest } = author;
  return {
    ...rest,
    ...profile,
    verified: verification?.status === 'VERIFIED',
  };
}

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private ranking: ContentRankingService,
    private eventBus: EventBusService,
    private mentions: MentionsService,
  ) {}

  async createPost(
    userId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    mentions?: MentionRef[],
  ) {
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
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
      await tx.event.create(
        this.eventBus.write('post.created', created.id, {
          authorId: userId,
          hasMedia: !!mediaUrl,
        }),
      );
      if (mentions?.length) {
        await this.mentions.record('post', created.id, mentions, tx);
      }
      return created;
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

  // Single-post detail view — the full thread: post + top-level comments,
  // each with one level of nested replies (matches how the client renders
  // threads; a reply-to-a-reply still attaches to its immediate parent
  // server-side, it just isn't fetched further than one level deep here).
  async getPost(id: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: true,
        reposts: true,
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: AUTHOR_SELECT },
            likes: true,
            replies: {
              orderBy: { createdAt: 'asc' },
              include: { author: { select: AUTHOR_SELECT }, likes: true },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');

    const [isBookmarkedByMe, isFollowedByMe] = await Promise.all([
      viewerId
        ? this.prisma.postBookmark
            .findUnique({ where: { postId_userId: { postId: id, userId: viewerId } } })
            .then((b) => !!b)
        : false,
      viewerId && viewerId !== post.authorId
        ? this.prisma.follow
            .findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: post.authorId } },
            })
            .then((f) => !!f)
        : false,
    ]);

    return {
      ...post,
      author: { ...toPostAuthor(post.author), isFollowedByMe },
      isBookmarkedByMe,
      comments: post.comments.map((c: any) => ({
        ...c,
        author: toPostAuthor(c.author),
        replies: c.replies.map((r: any) => ({ ...r, author: toPostAuthor(r.author) })),
      })),
    };
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

  async addComment(userId: string, postId: string, content: string, parentId?: string) {
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Invalid parent comment');
      }
      // Replies attach to their immediate parent even if that parent is
      // itself a reply — getPost() just doesn't fetch past one level deep,
      // it's not a schema limit.
    }
    const comment = await this.prisma.comment.create({
      data: { authorId: userId, postId, content, parentId: parentId ?? null },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return { ...comment, author: toPostAuthor(comment.author) };
  }

  async likeComment(userId: string, commentId: string) {
    try {
      await this.prisma.commentLike.create({ data: { userId, commentId } });
      return { status: 'liked' };
    } catch {
      await this.prisma.commentLike.delete({
        where: { commentId_userId: { commentId, userId } },
      });
      return { status: 'unliked' };
    }
  }
}
