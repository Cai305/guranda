import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSongDto } from './dto/create-song.dto';

const SONG_SELECT = {
  id: true,
  title: true,
  artistName: true,
  audioUrl: true,
  coverUrl: true,
  durationSeconds: true,
  source: true,
  uploadedById: true,
  useCount: true,
  createdAt: true,
};

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  /** An artist attaching their own track to the catalog — always ARTIST_UPLOAD, always attributed to them. */
  async uploadSong(userId: string, dto: CreateSongDto) {
    return this.prisma.song.create({
      data: {
        title: dto.title.trim(),
        artistName: dto.artistName.trim(),
        audioUrl: dto.audioUrl,
        coverUrl: dto.coverUrl,
        durationSeconds: dto.durationSeconds,
        source: 'ARTIST_UPLOAD',
        uploadedById: userId,
      },
      select: SONG_SELECT,
    });
  }

  /**
   * `mine` narrows to the caller's own uploads (the "My Sounds" tab);
   * otherwise this is the open/curated catalog (the "Library" tab) —
   * everyone's artist uploads plus any OPEN_LIBRARY seed tracks, newest
   * first. `query` does a simple case-insensitive title/artist match.
   */
  async listSongs(userId: string, opts: { mine?: boolean; query?: string } = {}) {
    const where: any = opts.mine
      ? { uploadedById: userId }
      : {};
    if (opts.query?.trim()) {
      where.OR = [
        { title: { contains: opts.query.trim(), mode: 'insensitive' } },
        { artistName: { contains: opts.query.trim(), mode: 'insensitive' } },
      ];
    }
    return this.prisma.song.findMany({
      where,
      select: SONG_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSong(id: string) {
    const song = await this.prisma.song.findUnique({ where: { id }, select: SONG_SELECT });
    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  async deleteSong(userId: string, id: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('Song not found');
    if (song.uploadedById !== userId) {
      throw new ForbiddenException('You can only remove your own uploads');
    }
    await this.prisma.song.delete({ where: { id } });
    return { ok: true };
  }

  /** Bumps a song's use count — called whenever it's attached to a Status or a published Performance, never on drafts (a draft might be discarded, and shouldn't inflate "how many people used this sound"). */
  async recordUse(songId: string) {
    await this.prisma.song.update({ where: { id: songId }, data: { useCount: { increment: 1 } } }).catch(() => {});
  }
}
