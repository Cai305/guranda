import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ContentRankingService,
  ReputationLevel,
} from '../ranking/content-ranking.service';

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
    return this.prisma.post.create({
      data: {
        authorId: userId,
        content,
        mediaUrl,
        mediaType,
      },
      include: {
        author: { include: { profile: true } },
      },
    });
  }

  async getFeed(viewerId?: string) {
    // Widen the raw pool beyond what's actually shown — ranking needs
    // candidates to reorder, not just the newest 50.
    const [posts, viewer] = await Promise.all([
      this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          author: { include: { profile: true, activeUsername: true } },
          likes: true,
          comments: {
            include: { author: { include: { profile: true } } },
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

    return this.ranking.rank(
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

  async addComment(userId: string, postId: string, content: string) {
    return this.prisma.comment.create({
      data: { authorId: userId, postId, content },
      include: { author: { include: { profile: true } } },
    });
  }
}
