import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVideoTemplateDto } from './dto/create-video-template.dto';

const SONG_SELECT = { id: true, title: true, artistName: true, audioUrl: true, coverUrl: true, durationSeconds: true };

const TEMPLATE_INCLUDE = {
  musicSong: { select: SONG_SELECT },
};

@Injectable()
export class VideoTemplatesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const templates = await this.prisma.videoTemplate.findMany({
      include: TEMPLATE_INCLUDE,
      orderBy: [{ useCount: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return templates;
  }

  async getOne(id: string) {
    const template = await this.prisma.videoTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(userId: string, dto: CreateVideoTemplateDto) {
    if (dto.musicSongId) {
      const song = await this.prisma.song.findUnique({ where: { id: dto.musicSongId } });
      if (!song) throw new NotFoundException('Song not found');
    }
    return this.prisma.videoTemplate.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        thumbnailUrl: dto.thumbnailUrl,
        filterPreset: dto.filterPreset,
        musicSongId: dto.musicSongId,
        textPresets: dto.textPresets ? (dto.textPresets as any) : undefined,
        clipCount: dto.clipCount ?? 1,
        createdById: userId,
      },
      include: TEMPLATE_INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    const template = await this.prisma.videoTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    if (template.createdById !== userId) {
      throw new ForbiddenException('You can only remove your own templates');
    }
    await this.prisma.videoTemplate.delete({ where: { id } });
    return { ok: true };
  }

  /** Bumps a template's use count — called whenever a project is created from it. */
  async recordUse(templateId: string) {
    await this.prisma.videoTemplate
      .update({ where: { id: templateId }, data: { useCount: { increment: 1 } } })
      .catch(() => {});
  }
}
