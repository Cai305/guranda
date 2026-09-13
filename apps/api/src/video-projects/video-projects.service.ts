import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VideoTemplatesService } from '../video-templates/video-templates.service';
import { VideoRenderService } from './video-render.service';
import { CreateVideoProjectDto } from './dto/create-video-project.dto';
import { UpdateVideoProjectDto } from './dto/update-video-project.dto';

const SONG_SELECT = { id: true, title: true, artistName: true, audioUrl: true, coverUrl: true, durationSeconds: true };

const PROJECT_INCLUDE = {
  musicSong: { select: SONG_SELECT },
  template: true,
  resultPerformance: {
    include: {
      song: { select: SONG_SELECT },
    },
  },
};

@Injectable()
export class VideoProjectsService {
  constructor(
    private prisma: PrismaService,
    private templates: VideoTemplatesService,
    private videoRender: VideoRenderService,
  ) {}

  private shape(p: any) {
    return {
      id: p.id,
      status: p.status,
      errorMessage: p.errorMessage,
      clips: p.clips,
      musicSong: p.musicSong,
      musicOffsetMs: p.musicOffsetMs,
      musicVolume: p.musicVolume,
      voiceEffect: p.voiceEffect,
      filterPreset: p.filterPreset,
      caption: p.caption,
      templateId: p.templateId,
      sourcePerformanceId: p.sourcePerformanceId,
      compositionMode: p.compositionMode,
      resultPerformanceId: p.resultPerformanceId,
      resultPerformance: p.resultPerformance
        ? {
            id: p.resultPerformance.id,
            videoUrl: p.resultPerformance.videoUrl,
            thumbnailUrl: p.resultPerformance.thumbnailUrl,
            caption: p.resultPerformance.caption,
            status: p.resultPerformance.status,
            song: p.resultPerformance.song,
          }
        : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async create(userId: string, dto: CreateVideoProjectDto) {
    if (!dto.clips?.length) throw new BadRequestException('At least one clip is required');

    let filterPreset = dto.filterPreset;
    let musicSongId = dto.musicSongId;

    if (dto.templateId) {
      const template = await this.templates.getOne(dto.templateId);
      // Template values are defaults only — anything the client already
      // sent explicitly wins (e.g. the user picked their own filter after
      // starting from a template).
      filterPreset = filterPreset ?? template.filterPreset ?? undefined;
      musicSongId = musicSongId ?? template.musicSongId ?? undefined;
      await this.templates.recordUse(dto.templateId);
    }

    if (musicSongId) {
      const song = await this.prisma.song.findUnique({ where: { id: musicSongId } });
      if (!song) throw new NotFoundException('Song not found');
    }

    if (dto.sourcePerformanceId) {
      const source = await this.prisma.performance.findUnique({ where: { id: dto.sourcePerformanceId } });
      if (!source || source.status !== 'PUBLISHED') {
        throw new NotFoundException('Source performance not found');
      }
      if (!dto.compositionMode) {
        throw new BadRequestException('compositionMode is required when sourcePerformanceId is set');
      }
    }

    const project = await this.prisma.videoProject.create({
      data: {
        userId,
        clips: dto.clips as any,
        musicSongId: musicSongId ?? null,
        musicOffsetMs: dto.musicOffsetMs ?? 0,
        musicVolume: dto.musicVolume ?? 1,
        voiceEffect: dto.voiceEffect ?? null,
        filterPreset: filterPreset ?? null,
        caption: dto.caption?.trim() || null,
        templateId: dto.templateId ?? null,
        sourcePerformanceId: dto.sourcePerformanceId ?? null,
        compositionMode: dto.compositionMode ?? null,
      },
      include: PROJECT_INCLUDE,
    });
    return this.shape(project);
  }

  private async findOwned(userId: string, id: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException('Not your project');
    return project;
  }

  async update(userId: string, id: string, dto: UpdateVideoProjectDto) {
    const existing = await this.findOwned(userId, id);
    if (existing.status === 'RENDERING') {
      throw new BadRequestException('Cannot edit a project while it is rendering');
    }
    if (dto.musicSongId) {
      const song = await this.prisma.song.findUnique({ where: { id: dto.musicSongId } });
      if (!song) throw new NotFoundException('Song not found');
    }
    const project = await this.prisma.videoProject.update({
      where: { id },
      data: {
        clips: dto.clips !== undefined ? (dto.clips as any) : undefined,
        musicSongId: dto.musicSongId !== undefined ? dto.musicSongId : undefined,
        musicOffsetMs: dto.musicOffsetMs,
        musicVolume: dto.musicVolume,
        voiceEffect: dto.voiceEffect !== undefined ? dto.voiceEffect : undefined,
        filterPreset: dto.filterPreset,
        caption: dto.caption !== undefined ? dto.caption.trim() || null : undefined,
        // A previously-failed render is worth another try once the plan
        // changes — reset it back to DRAFT so `render()` is callable again.
        status: existing.status === 'FAILED' ? 'DRAFT' : undefined,
        errorMessage: existing.status === 'FAILED' ? null : undefined,
      },
      include: PROJECT_INCLUDE,
    });
    return this.shape(project);
  }

  async getOne(userId: string, id: string) {
    const project = await this.prisma.videoProject.findUnique({
      where: { id },
      include: PROJECT_INCLUDE,
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException('Not your project');
    return this.shape(project);
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.videoProject.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Kicks off the ffmpeg render (fire-and-forget, mirrors
   * video-transcode.service's single-concurrency in-memory queue) and
   * returns immediately with status RENDERING — the client polls
   * GET /video-projects/:id until it flips to READY (resultPerformanceId
   * set) or FAILED (errorMessage set).
   */
  async render(userId: string, id: string, status: 'DRAFT' | 'PUBLISHED') {
    const project = await this.findOwned(userId, id);
    const clips = (project.clips as any[]) ?? [];
    if (!clips.length) throw new BadRequestException('At least one clip is required');
    if (project.status === 'RENDERING') {
      throw new BadRequestException('Already rendering');
    }
    await this.prisma.videoProject.update({
      where: { id },
      data: { status: 'RENDERING', errorMessage: null },
    });
    this.videoRender.enqueue(id, status);
    return { status: 'RENDERING' };
  }
}
