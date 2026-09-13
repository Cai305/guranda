import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SongsService } from '../songs/songs.service';
import { BlocksService } from '../blocks/blocks.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';

const AUTHOR_SELECT = { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } };
const SONG_SELECT = { id: true, title: true, artistName: true, audioUrl: true, coverUrl: true, durationSeconds: true };

const PERFORMANCE_INCLUDE = {
  user: { select: AUTHOR_SELECT },
  song: { select: SONG_SELECT },
  _count: { select: { likes: true, comments: true } },
};

const FEED_PAGE_SIZE = 20;

@Injectable()
export class PerformancesService {
  constructor(
    private prisma: PrismaService,
    private songsService: SongsService,
    private blocksService: BlocksService,
  ) {}

  private shape(p: any, viewerId?: string) {
    return {
      id: p.id,
      mode: p.mode,
      videoUrl: p.videoUrl,
      thumbnailUrl: p.thumbnailUrl,
      offsetMs: p.offsetMs,
      caption: p.caption,
      status: p.status,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      user: {
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.profile?.displayName ?? p.user.username,
        avatarUrl: p.user.profile?.avatarUrl ?? null,
      },
      song: p.song,
      sourcePerformanceId: p.sourcePerformanceId ?? null,
      compositionMode: p.compositionMode ?? null,
      likeCount: p._count?.likes ?? 0,
      commentCount: p._count?.comments ?? 0,
      likedByMe: Array.isArray(p.likes) ? p.likes.some((l: any) => l.userId === viewerId) : undefined,
    };
  }

  async create(userId: string, dto: CreatePerformanceDto) {
    if (dto.mode !== 'EDITED' && !dto.songId) {
      throw new BadRequestException('songId is required for this mode');
    }
    if (dto.songId) {
      const song = await this.prisma.song.findUnique({ where: { id: dto.songId } });
      if (!song) throw new NotFoundException('Song not found');
    }

    const status = dto.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    const performance = await this.prisma.performance.create({
      data: {
        userId,
        songId: dto.songId ?? null,
        mode: dto.mode,
        videoUrl: dto.videoUrl,
        thumbnailUrl: dto.thumbnailUrl,
        offsetMs: dto.offsetMs ?? 0,
        caption: dto.caption?.trim() || null,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
      include: PERFORMANCE_INCLUDE,
    });
    if (status === 'PUBLISHED' && dto.songId) await this.songsService.recordUse(dto.songId);
    return this.shape(performance, userId);
  }

  /**
   * Internal-only creation path for the video-editor render pipeline
   * (video-render.service) — never exposed on the controller. Distinct from
   * `create()` because it needs to set `sourcePerformanceId`/`compositionMode`
   * (duet/stitch attribution), which a client must never be able to set
   * directly on a plain POST /performances (that would let anyone claim
   * "this is a duet of X" over an arbitrary, uncomposited video).
   */
  async createRenderedPerformance(params: {
    userId: string;
    songId?: string | null;
    videoUrl: string;
    thumbnailUrl?: string | null;
    caption?: string | null;
    status: 'DRAFT' | 'PUBLISHED';
    sourcePerformanceId?: string | null;
    compositionMode?: 'DUET' | 'STITCH' | null;
  }) {
    const performance = await this.prisma.performance.create({
      data: {
        userId: params.userId,
        songId: params.songId ?? null,
        mode: 'EDITED',
        videoUrl: params.videoUrl,
        thumbnailUrl: params.thumbnailUrl ?? null,
        caption: params.caption?.trim() || null,
        status: params.status,
        publishedAt: params.status === 'PUBLISHED' ? new Date() : null,
        sourcePerformanceId: params.sourcePerformanceId ?? null,
        compositionMode: params.compositionMode ?? null,
      },
      include: PERFORMANCE_INCLUDE,
    });
    if (params.status === 'PUBLISHED' && params.songId) {
      await this.songsService.recordUse(params.songId);
    }
    return this.shape(performance, params.userId);
  }

  async update(userId: string, id: string, dto: UpdatePerformanceDto) {
    const existing = await this.prisma.performance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Performance not found');
    if (existing.userId !== userId) throw new ForbiddenException('Not your performance');

    const isPublishing = dto.status === 'PUBLISHED' && existing.status === 'DRAFT';
    const updated = await this.prisma.performance.update({
      where: { id },
      data: {
        caption: dto.caption !== undefined ? dto.caption.trim() || null : undefined,
        offsetMs: dto.offsetMs,
        status: dto.status,
        publishedAt: isPublishing ? new Date() : undefined,
      },
      include: PERFORMANCE_INCLUDE,
    });
    if (isPublishing && existing.songId) await this.songsService.recordUse(existing.songId);
    return this.shape(updated, userId);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.performance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Performance not found');
    if (existing.userId !== userId) throw new ForbiddenException('Not your performance');
    await this.prisma.performance.delete({ where: { id } });
    return { ok: true };
  }

  async getMyDrafts(userId: string) {
    const drafts = await this.prisma.performance.findMany({
      where: { userId, status: 'DRAFT' },
      include: PERFORMANCE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return drafts.map((d) => this.shape(d, userId));
  }

  async getOne(userId: string | undefined, id: string) {
    const p = await this.prisma.performance.findUnique({
      where: { id },
      include: { ...PERFORMANCE_INCLUDE, likes: userId ? { where: { userId } } : false },
    });
    if (!p) throw new NotFoundException('Performance not found');
    if (p.status === 'DRAFT' && p.userId !== userId) throw new NotFoundException('Performance not found');
    return this.shape(p, userId);
  }

  async getFeed(viewerId: string | undefined, cursor?: string) {
    const blocked = viewerId ? await this.blocksService.getBlockedEitherDirection(viewerId) : new Set<string>();
    const rows = await this.prisma.performance.findMany({
      where: {
        status: 'PUBLISHED',
        ...(cursor ? { publishedAt: { lt: new Date(cursor) } } : {}),
        ...(blocked.size > 0 ? { userId: { notIn: [...blocked] } } : {}),
      },
      include: { ...PERFORMANCE_INCLUDE, likes: viewerId ? { where: { userId: viewerId } } : false },
      orderBy: { publishedAt: 'desc' },
      take: FEED_PAGE_SIZE,
    });
    const performances = rows.map((p) => this.shape(p, viewerId));
    const nextCursor = rows.length === FEED_PAGE_SIZE ? rows[rows.length - 1].publishedAt?.toISOString() ?? null : null;
    return { performances, nextCursor };
  }

  async toggleLike(userId: string, performanceId: string, like: boolean) {
    const performance = await this.prisma.performance.findUnique({ where: { id: performanceId } });
    if (!performance) throw new NotFoundException('Performance not found');
    if (like) {
      await this.prisma.performanceLike.upsert({
        where: { performanceId_userId: { performanceId, userId } },
        create: { performanceId, userId },
        update: {},
      });
    } else {
      await this.prisma.performanceLike.deleteMany({ where: { performanceId, userId } });
    }
    const likeCount = await this.prisma.performanceLike.count({ where: { performanceId } });
    return { likeCount, likedByMe: like };
  }

  async listComments(performanceId: string) {
    const comments = await this.prisma.performanceComment.findMany({
      where: { performanceId },
      include: { user: { select: AUTHOR_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
    return comments.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      user: { id: c.user.id, username: c.user.username, displayName: c.user.profile?.displayName ?? c.user.username, avatarUrl: c.user.profile?.avatarUrl ?? null },
    }));
  }

  async addComment(userId: string, performanceId: string, text: string) {
    if (!text.trim()) throw new BadRequestException('Comment cannot be empty');
    const performance = await this.prisma.performance.findUnique({ where: { id: performanceId } });
    if (!performance) throw new NotFoundException('Performance not found');
    const comment = await this.prisma.performanceComment.create({
      data: { performanceId, userId, text: text.trim() },
      include: { user: { select: AUTHOR_SELECT } },
    });
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      user: { id: comment.user.id, username: comment.user.username, displayName: comment.user.profile?.displayName ?? comment.user.username, avatarUrl: comment.user.profile?.avatarUrl ?? null },
    };
  }
}
