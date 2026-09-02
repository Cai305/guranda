import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ContentRankingService,
  ReputationLevel,
} from '../ranking/content-ranking.service';
import { EventBusService } from '../events/event-bus.service';
import { MentionsService, MentionRef } from '../mentions/mentions.service';
import { PostsGateway } from './posts.gateway';
import { BadgeService } from '../profile/badge.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BlocksService } from '../blocks/blocks.service';
import { AchievementsService } from '../achievements/achievements.service';

export type PostMediaInput = { url: string; type: string; thumbnailUrl?: string };

function toPositiveInt(raw: number | undefined, fallback: number, max = 50): number {
  if (raw === undefined || !Number.isFinite(raw) || raw < 0) return fallback;
  return Math.min(Math.trunc(raw), max);
}

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
    private postsGateway: PostsGateway,
    private badgeService: BadgeService,
    private notifications: NotificationsService,
    private blocks: BlocksService,
    private achievements: AchievementsService,
  ) {}

  // TEMPORARY (see schema.prisma note on Post.mediaUrl/mediaType): copies
  // the legacy singular mediaUrl/mediaType columns into PostMedia rows for
  // any post that doesn't have one yet, so the old columns can be dropped
  // without losing data. Idempotent — safe to call more than once. Remove
  // this method + its controller route once the columns are gone.
  async backfillLegacyMedia() {
    const rows: { id: string; mediaUrl: string | null; mediaType: string | null }[] =
      await this.prisma.$queryRaw`SELECT id, "mediaUrl", "mediaType" FROM "Post" WHERE "mediaUrl" IS NOT NULL`;
    const existing = await this.prisma.postMedia.findMany({
      where: { postId: { in: rows.map((r) => r.id) } },
      select: { postId: true },
    });
    const alreadyMigrated = new Set(existing.map((e) => e.postId));
    const toMigrate = rows.filter((r) => !alreadyMigrated.has(r.id));
    if (toMigrate.length) {
      await this.prisma.postMedia.createMany({
        data: toMigrate.map((r) => ({
          postId: r.id,
          url: r.mediaUrl!,
          type: r.mediaType ?? 'IMAGE',
          position: 0,
        })),
      });
    }
    return { totalLegacy: rows.length, migrated: toMigrate.length };
  }

  async createPost(
    userId: string,
    content: string,
    media?: PostMediaInput[],
    mentions?: MentionRef[],
  ) {
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: userId,
          content,
          media: {
            create: (media ?? []).map((m, i) => ({ url: m.url, type: m.type, position: i, thumbnailUrl: m.thumbnailUrl ?? null })),
          },
        },
        include: {
          author: { select: AUTHOR_SELECT },
          media: { orderBy: { position: 'asc' } },
        },
      });
      await tx.event.create(
        this.eventBus.write('post.created', created.id, {
          authorId: userId,
          hasMedia: (media?.length ?? 0) > 0,
        }),
      );
      if (mentions?.length) {
        await this.mentions.record('post', created.id, mentions, tx);
      }
      return created;
    });
    this.postsGateway.broadcastNewPost(post);
    // Best-effort — a first-500 scarcity check should never block posting.
    this.badgeService.tryMintScarce(userId, 'OG_CREATOR').catch(() => {});
    this.achievements.evaluatePlatformAchievementsForUser(userId).catch(() => {});
    return { ...post, author: toPostAuthor(post.author) };
  }

  // Shared by both feed variants — resolves the viewer's private bookmark
  // state and per-author follow state, and normalizes author shape, without
  // leaking who else bookmarked each post.
  // Mutual invisibility: a block in either direction hides that person's
  // posts from the feed entirely, and their comments off of anyone else's
  // posts too — matches the confirmed "full feed/profile invisibility"
  // blocking scope, not just chat/calls/friend-requests.
  private async hydrate(posts: any[], viewerId?: string) {
    const blockedIds = viewerId
      ? await this.blocks.getBlockedEitherDirection(viewerId)
      : new Set<string>();
    if (blockedIds.size > 0) {
      posts = posts
        .filter((p) => !blockedIds.has(p.authorId))
        .map((p) => ({
          ...p,
          comments: p.comments.filter((c: any) => !blockedIds.has(c.authorId)),
        }));
    }

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

  // Cursor is the ISO createdAt of the last post the client already has —
  // simpler and less error-prone than an id-based cursor here, since Post.id
  // is a random UUID (not sortable), so `id: {lt: cursor}` wouldn't actually
  // track recency the way it does for models with sequential/sortable ids.
  //
  // getFeed reranks its raw pool by score (recency/reputation/proximity),
  // so the returned page is NOT in chronological order — the client can't
  // safely derive the next cursor from the last item it received (a
  // low-scoring-but-recent post could get pushed past the page cut, then
  // permanently excluded by `createdAt < cursor` on the next call before it
  // ever has a chance to surface, silently breaking infinite scroll). The
  // cursor returned here instead tracks the boundary of the raw chronological
  // pool, so a post is never skipped — only its position within a page can
  // shift as later batches get reranked, not whether it's ever reachable.
  async getFeed(viewerId?: string, take = 20, cursor?: string) {
    const pageSize = toPositiveInt(take, 20);
    const poolSize = Math.max(pageSize * 4, 50);
    // Widen the raw pool beyond what's actually shown — ranking needs
    // candidates to reorder, not just the newest page.
    const [posts, viewer] = await Promise.all([
      this.prisma.post.findMany({
        where: cursor ? { createdAt: { lt: new Date(cursor) } } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: FEED_AUTHOR_SELECT },
          media: { orderBy: { position: 'asc' } },
          likes: true,
          reposts: true,
          comments: {
            include: { author: { select: AUTHOR_SELECT } },
            orderBy: { createdAt: 'asc' },
          },
        },
        take: poolSize,
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
      pageSize,
    );

    // Fewer raw rows than we asked for means we've hit the true end of the
    // table — no cursor to hand back, or the client would loop forever on
    // an unchanging `createdAt < cursor` boundary.
    const nextCursor = posts.length < poolSize ? null : posts[posts.length - 1].createdAt.toISOString();

    return { posts: await this.hydrate(ranked, viewerId), nextCursor };
  }

  // Trending — engagement-scored, not personalized (no reputation/proximity
  // weighting like getFeed's ranking). Deliberately a separate formula from
  // ContentRankingService.scoreItem rather than an extension of it, since
  // that service also backs the personalized feed and live-room listing and
  // shouldn't change behavior there.
  async getTrendingPosts(take = 15) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const posts = await this.prisma.post.findMany({
      where: { createdAt: { gte: since } },
      include: {
        author: { select: AUTHOR_SELECT },
        media: { orderBy: { position: 'asc' } },
        likes: true,
        reposts: true,
        comments: {
          include: { author: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: 300,
    });

    const scored = posts
      .map((p) => {
        const ageHours = Math.max(
          0,
          (Date.now() - p.createdAt.getTime()) / 3600000,
        );
        const recency = Math.exp(-ageHours / 48);
        const engagement =
          p.likes.length * 3 + p.comments.length * 4 + p.reposts.length * 5 + p.views * 0.1;
        return { post: p, score: engagement * recency };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, take)
      .map((s) => s.post);

    return this.hydrate(scored);
  }

  // Following tab — plain reverse-chronological, not the "For You" ranking
  // algorithm, matching the reference feed's distinction between the two.
  async getFollowingFeed(viewerId: string, take = 20, cursor?: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    if (!follows.length) return [];

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: follows.map((f) => f.followingId) },
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: AUTHOR_SELECT },
        media: { orderBy: { position: 'asc' } },
        likes: true,
        reposts: true,
        comments: {
          include: { author: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: toPositiveInt(take, 20),
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
        media: { orderBy: { position: 'asc' } },
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
    const [postCount, likesReceived, commentsReceived, viewsAgg] = await Promise.all([
      this.prisma.post.count({ where: { authorId: userId } }),
      this.prisma.postLike.count({ where: { post: { authorId: userId } } }),
      this.prisma.comment.count({ where: { post: { authorId: userId } } }),
      this.prisma.post.aggregate({
        where: { authorId: userId },
        _sum: { views: true },
      }),
    ]);
    const totalViews = viewsAgg._sum.views || 0;
    return { postCount, likesReceived, commentsReceived, totalViews };
  }

  async getUserPosts(authorId: string, viewerId?: string, take = 20, cursor?: string) {
    const pageSize = toPositiveInt(take, 20);
    const posts = await this.prisma.post.findMany({
      where: {
        authorId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: AUTHOR_SELECT },
        media: { orderBy: { position: 'asc' } },
        likes: true,
        reposts: true,
        comments: {
          include: { author: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: pageSize + 1,
    });

    let nextCursor: string | null = null;
    if (posts.length > pageSize) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.createdAt.toISOString();
    }

    let bookmarks = new Set<string>();
    if (viewerId && posts.length > 0) {
      const bms = await this.prisma.postBookmark.findMany({
        where: { userId: viewerId, postId: { in: posts.map(p => p.id) } },
      });
      bookmarks = new Set(bms.map(b => b.postId));
    }

    const mapped = posts.map((p) => ({
      ...p,
      isBookmarkedByMe: bookmarks.has(p.id),
    }));

    return { posts: mapped, nextCursor };
  }

  async likePost(userId: string, postId: string) {
    try {
      const like = await this.prisma.postLike.create({
        data: { userId, postId },
        include: { post: { select: { authorId: true } } },
      });
      if (like.post.authorId !== userId) {
        await this.notifications.create(
          like.post.authorId,
          'post.liked',
          'New like',
          'Someone liked your post',
          { postId, userId },
        );
      }
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
      const repost = await this.prisma.postRepost.create({
        data: { userId, postId },
        include: { post: { select: { authorId: true } } },
      });
      if (repost.post.authorId !== userId) {
        await this.notifications.create(
          repost.post.authorId,
          'post.reposted',
          'New repost',
          'Someone reposted your post',
          { postId, userId },
        );
      }
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
      include: { author: { select: AUTHOR_SELECT }, post: { select: { authorId: true } } },
    });
    if (comment.post.authorId !== userId) {
      await this.notifications.create(
        comment.post.authorId,
        'post.comment',
        'New comment',
        'Someone commented on your post',
        { postId, commentId: comment.id, userId },
      );
    }
    const { post: _post, ...rest } = comment;
    return { ...rest, author: toPostAuthor(comment.author) };
  }

  async likeComment(userId: string, commentId: string) {
    try {
      const like = await this.prisma.commentLike.create({
        data: { userId, commentId },
        include: { comment: { select: { authorId: true } } },
      });
      if (like.comment.authorId !== userId) {
        await this.notifications.create(
          like.comment.authorId,
          'post.comment_liked',
          'New like',
          'Someone liked your comment',
          { commentId, userId },
        );
      }
      return { status: 'liked' };
    } catch {
      await this.prisma.commentLike.delete({
        where: { commentId_userId: { commentId, userId } },
      });
      return { status: 'unliked' };
    }
  }
}
