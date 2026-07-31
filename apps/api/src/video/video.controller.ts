import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request as ExpressRequest } from 'express';
import { VideoService } from './video.service';
import { uploadToBlob } from '../blob.util';
import { JwtAuthGuard } from '../auth/auth.guard';

// Previously every route here read a client-supplied `x-user-id` header
// instead of the authenticated JWT — meaning anyone could upload, like,
// comment, or read another user's watch history/playlists just by setting
// that header to someone else's id. Fixed by switching to the same
// JwtAuthGuard + req.user pattern as the rest of the API. No mobile client
// change needed: fetchApi already sends a real Authorization bearer token
// on every request (see docs/testing/TEST_REPORT.md §4 for the original finding).
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideoController {
  constructor(private readonly video: VideoService) {}

  // ── Upload video file ─────────────────────────────────────────────────────
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 },
      fileFilter: (
        _req: ExpressRequest,
        file: Express.Multer.File,
        cb: (e: Error | null, ok: boolean) => void,
      ) => {
        if (!file.mimetype.startsWith('video/'))
          return cb(new BadRequestException('Only video files allowed'), false);
        cb(null, true);
      },
    }),
  )
  async uploadVideo(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const duration = parseInt(body.duration, 10);
    if (!duration || duration <= 45)
      throw new BadRequestException('Video must be longer than 45 seconds');

    const url = await uploadToBlob('videos', file);

    return this.video.createVideo(req.user.userId, {
      title: body.title || 'Untitled',
      description: body.description,
      url,
      thumbnailUrl: body.thumbnailUrl,
      duration,
      category: body.category || 'General',
      tags: body.tags
        ? body.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
    });
  }

  // ── Feed & discovery ──────────────────────────────────────────────────────
  @Get('feed')
  getFeed(@Request() req: any) {
    return this.video.getFeed(req.user.userId);
  }

  @Get('trending')
  getTrending(@Request() req: any) {
    return this.video.getTrending(req.user.userId);
  }

  @Get('search')
  search(@Query('q') q: string, @Request() req: any) {
    if (!q) return [];
    return this.video.search(q, req.user.userId);
  }

  @Get('watch-later')
  getWatchLater(@Request() req: any) {
    return this.video.getWatchLater(req.user.userId);
  }

  // ── Interests ─────────────────────────────────────────────────────────────
  @Get('interests')
  getInterests(@Request() req: any) {
    return this.video.getInterests(req.user.userId);
  }

  @Patch('interests')
  setInterests(@Request() req: any, @Body('interests') interests: string[]) {
    return this.video.setInterests(req.user.userId, interests ?? []);
  }

  // ── Single video (must come after named routes) ───────────────────────────
  @Get(':id')
  getVideo(@Param('id') id: string, @Request() req: any) {
    return this.video.getVideo(id, req.user.userId);
  }

  @Post(':id/view')
  recordView(
    @Param('id') id: string,
    @Request() req: any,
    @Body('progress') progress: number,
  ) {
    return this.video.recordView(id, req.user.userId, progress ?? 0);
  }

  @Post(':id/like')
  likeVideo(@Param('id') id: string, @Request() req: any) {
    return this.video.likeVideo(id, req.user.userId);
  }

  @Delete(':id/like')
  unlikeVideo(@Param('id') id: string, @Request() req: any) {
    return this.video.unlikeVideo(id, req.user.userId);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.video.getComments(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Request() req: any,
    @Body('text') text: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('Comment cannot be empty');
    return this.video.addComment(id, req.user.userId, text.trim());
  }

  @Post(':id/watch-later')
  addWatchLater(@Param('id') id: string, @Request() req: any) {
    return this.video.addWatchLater(id, req.user.userId);
  }

  @Delete(':id/watch-later')
  removeWatchLater(@Param('id') id: string, @Request() req: any) {
    return this.video.removeWatchLater(id, req.user.userId);
  }

  @Get(':id/related')
  getRelated(@Param('id') id: string, @Query('category') category: string) {
    return this.video.getRelated(id, category ?? '');
  }

  // ── Playlists ─────────────────────────────────────────────────────────────
  @Get('playlists/mine')
  getMyPlaylists(@Request() req: any) {
    return this.video.getMyPlaylists(req.user.userId);
  }

  @Post('playlists')
  createPlaylist(
    @Request() req: any,
    @Body('name') name: string,
    @Body('isPublic') isPublic: boolean,
  ) {
    if (!name?.trim()) throw new BadRequestException('Playlist name required');
    return this.video.createPlaylist(req.user.userId, name.trim(), isPublic ?? true);
  }

  @Get('playlists/:id')
  getPlaylist(@Param('id') id: string) {
    return this.video.getPlaylist(id);
  }

  @Delete('playlists/:id')
  deletePlaylist(@Param('id') id: string, @Request() req: any) {
    return this.video.deletePlaylist(id, req.user.userId);
  }

  @Post('playlists/:id/videos')
  addToPlaylist(
    @Param('id') id: string,
    @Request() req: any,
    @Body('videoId') videoId: string,
  ) {
    return this.video.addToPlaylist(id, videoId, req.user.userId);
  }

  @Delete('playlists/:id/videos/:videoId')
  removeFromPlaylist(
    @Param('id') id: string,
    @Param('videoId') videoId: string,
    @Request() req: any,
  ) {
    return this.video.removeFromPlaylist(id, videoId, req.user.userId);
  }
}
