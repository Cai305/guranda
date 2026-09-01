import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import ffmpeg = require('fluent-ffmpeg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string = require('ffmpeg-static');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobePath: string = require('ffprobe-static').path;
import { PrismaService } from '../prisma.service';
import { uploadBufferToSupabase } from '../supabase.util';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

type RenditionLabel = '720p' | '480p' | '360p';

// Candidate output heights, largest first — a candidate is only used if it's
// strictly smaller than the source height (never upscale; Video.url is
// always the top/"Auto" quality already).
const CANDIDATE_HEIGHTS: { label: RenditionLabel; height: number }[] = [
  { label: '720p', height: 720 },
  { label: '480p', height: 480 },
  { label: '360p', height: 360 },
];

interface TranscodeJob {
  videoId: string;
  sourceUrl: string;
}

// Background video transcoding: after a video is uploaded, downloads the
// original, probes it, and produces smaller h264/aac renditions (720p/480p/
// 360p, whichever are actually smaller than the source) so the player can
// offer a real quality picker instead of a single fixed-resolution file.
//
// Queue design note: this codebase has no Redis/BullMQ or any distributed
// job-queue infrastructure at all (grepped to confirm). Standing one up just
// for this would be over-engineering for an MVP-scale app on a small Render
// instance. Instead this is a deliberately simple single-concurrency
// in-memory FIFO array, processed one job at a time behind a `processing`
// flag — enough to stop many concurrent uploads from spawning a pile of
// ffmpeg processes and starving the instance's CPU/memory, at the honest
// cost of: jobs are lost on process restart (acceptable — a video just stays
// on "processing"/serves its original url forever, never a crash) and there's
// no cross-instance coordination if this API ever scales horizontally. If
// that becomes a real problem, swap this queue for BullMQ+Redis without
// touching any of the per-job logic below.
@Injectable()
export class VideoTranscodeService {
  private readonly logger = new Logger(VideoTranscodeService.name);
  private readonly queue: TranscodeJob[] = [];
  private processing = false;

  constructor(private prisma: PrismaService) {}

  /** Fire-and-forget: caller does not await transcoding. */
  enqueue(videoId: string, sourceUrl: string): void {
    this.queue.push({ videoId, sourceUrl });
    void this.kick();
  }

  private async kick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      let job: TranscodeJob | undefined;
      while ((job = this.queue.shift())) {
        await this.runJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async runJob(job: TranscodeJob): Promise<void> {
    const { videoId, sourceUrl } = job;
    const tempFiles: string[] = [];
    try {
      const sourcePath = await this.downloadToTemp(sourceUrl);
      tempFiles.push(sourcePath);

      const probe = await this.probe(sourcePath);
      const sourceHeight = probe.height ?? 0;

      const targets = CANDIDATE_HEIGHTS.filter(
        (c) => sourceHeight > c.height,
      ).slice(0, 3);

      for (const target of targets) {
        const outPath = path.join(
          os.tmpdir(),
          `${crypto.randomBytes(8).toString('hex')}-${target.label}.mp4`,
        );
        tempFiles.push(outPath);

        const dims = await this.transcodeTo(sourcePath, outPath, target.height);
        const buffer = await fs.readFile(outPath);
        const url = await uploadBufferToSupabase(
          buffer,
          'video/mp4',
          'videos/renditions',
        );

        await this.prisma.videoRendition.upsert({
          where: { videoId_label: { videoId, label: target.label } },
          update: { url, width: dims.width, height: dims.height },
          create: {
            videoId,
            label: target.label,
            url,
            width: dims.width,
            height: dims.height,
            bitrate: null,
          },
        });
      }

      // Thumbnail generation — a cosmetic addition, not a required part of
      // the job. Runs regardless of whether any renditions were produced
      // (e.g. a source already at 360p still gets zero renditions but
      // should still get a thumbnail). Only generated if the video doesn't
      // already have a user-supplied thumbnailUrl, and any failure here is
      // swallowed so it never flips the whole job to 'failed' — a video
      // with no thumbnail just keeps showing the existing placeholder.
      let thumbnailUrl: string | undefined;
      try {
        const existing = await this.prisma.video.findUnique({
          where: { id: videoId },
          select: { thumbnailUrl: true },
        });
        if (!existing?.thumbnailUrl) {
          const thumbPath = path.join(
            os.tmpdir(),
            `${crypto.randomBytes(8).toString('hex')}-thumb.jpg`,
          );
          tempFiles.push(thumbPath);

          // Grab a frame ~1s in (avoids a black/blank frame-0 intro on many
          // sources); fall back to frame 0 for very short/edge-case videos.
          const seekSeconds =
            probe.duration !== undefined && probe.duration < 1.5 ? 0 : 1;
          await this.extractThumbnail(sourcePath, thumbPath, seekSeconds);

          const thumbBuffer = await fs.readFile(thumbPath);
          thumbnailUrl = await uploadBufferToSupabase(
            thumbBuffer,
            'image/jpeg',
            'videos/thumbnails',
          );
        }
      } catch (thumbErr) {
        this.logger.error(
          `Thumbnail generation failed for video ${videoId}: ${(thumbErr as Error)?.message}`,
          (thumbErr as Error)?.stack,
        );
      }

      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          processingStatus: 'ready',
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
        },
      });
    } catch (err) {
      this.logger.error(
        `Transcode failed for video ${videoId}: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      try {
        await this.prisma.video.update({
          where: { id: videoId },
          data: { processingStatus: 'failed' },
        });
      } catch (updateErr) {
        this.logger.error(
          `Also failed to mark video ${videoId} as failed: ${(updateErr as Error)?.message}`,
        );
      }
    } finally {
      await Promise.all(
        tempFiles.map((f) => fs.unlink(f).catch(() => undefined)),
      );
    }
  }

  private async downloadToTemp(sourceUrl: string): Promise<string> {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(
        `Failed to download source video (${res.status} ${res.statusText})`,
      );
    }
    const arrayBuffer = await res.arrayBuffer();
    const tempPath = path.join(
      os.tmpdir(),
      `${crypto.randomBytes(8).toString('hex')}-source.mp4`,
    );
    await fs.writeFile(tempPath, Buffer.from(arrayBuffer));
    return tempPath;
  }

  private probe(
    filePath: string,
  ): Promise<{ width?: number; height?: number; duration?: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return reject(err);
        const videoStream = data.streams.find(
          (s) => s.codec_type === 'video',
        );
        resolve({
          width: videoStream?.width,
          height: videoStream?.height,
          duration: data.format?.duration
            ? Number(data.format.duration)
            : undefined,
        });
      });
    });
  }

  /**
   * Transcode `sourcePath` to h264/aac mp4 at the given target height,
   * preserving aspect ratio (scale filter -2:HEIGHT keeps width even/valid).
   * ffmpeg command template:
   *   ffmpeg -i <source> -vf scale=-2:<height> -c:v libx264 -crf 23
   *          -preset veryfast -c:a aac -b:a 128k -movflags +faststart <out>
   */
  private transcodeTo(
    sourcePath: string,
    outPath: string,
    height: number,
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .videoFilters(`scale=-2:${height}`)
        .videoCodec('libx264')
        .outputOptions(['-crf 23', '-preset veryfast', '-movflags +faststart'])
        .audioCodec('aac')
        .audioBitrate('128k')
        .on('error', (err: Error) => reject(err))
        .on('end', async () => {
          try {
            const out = await this.probe(outPath);
            resolve({
              width: out.width ?? 0,
              height: out.height ?? height,
            });
          } catch (e) {
            reject(e);
          }
        })
        .save(outPath);
    });
  }

  /**
   * Extract a single JPEG frame from `sourcePath` at `seekSeconds` into the
   * source and write it to `outPath`. Uses seekInput (fast "-ss before -i"
   * seek) plus "-vframes 1" to grab exactly one frame.
   */
  private extractThumbnail(
    sourcePath: string,
    outPath: string,
    seekSeconds: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .seekInput(seekSeconds)
        .outputOptions(['-vframes 1'])
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outPath);
    });
  }
}
