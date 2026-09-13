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
import { PerformancesService } from '../performances/performances.service';
import { uploadBufferToSupabase } from '../supabase.util';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const OUT_W = 1080;
const OUT_H = 1920;
const OUT_FPS = 30;

interface EditPlanOverlay {
  imageUrl: string;
  xNorm: number;
  yNorm: number;
  widthNorm: number;
  startMs: number;
  endMs?: number | null;
}

type TransitionType = 'cut' | 'fade' | 'slide';

interface EditPlanClip {
  id: string;
  sourceUrl: string;
  sourceType: 'RECORDED' | 'LIBRARY';
  trimStartMs: number;
  trimEndMs?: number | null;
  speed: number;
  overlays?: EditPlanOverlay[];
  /** Transition INTO the next clip; ignored on the last clip. */
  transitionOut?: TransitionType;
}

const TRANSITION_DURATION_SEC = 0.5;

/**
 * ffmpeg's `atempo` filter only accepts a single instance in [0.5, 2.0] —
 * anything outside that (this app's speed range is 0.3–3.0 for a real
 * CapCut-style range) has to be a CHAIN of atempo filters whose product
 * equals the requested speed, e.g. 3.0x -> "atempo=2.0,atempo=1.5".
 */
function buildAtempoChain(speed: number): string {
  const factors: number[] = [];
  let remaining = speed;
  while (remaining > 2.0) { factors.push(2.0); remaining /= 2.0; }
  while (remaining < 0.5) { factors.push(0.5); remaining /= 0.5; }
  if (Math.abs(remaining - 1) > 0.001) factors.push(remaining);
  return factors.map((f) => `atempo=${f.toFixed(4)}`).join(',');
}

interface RenderJob {
  projectId: string;
  publishStatus: 'DRAFT' | 'PUBLISHED';
}

// Mirrors MediaEditorScreen's FILTER_PRESETS keys so a named look means the
// same thing on a photo and on a video — the numbers aren't a pixel-for-
// pixel match to the Skia color matrix used for the live photo editor, just
// an honest, analogous ffmpeg equivalent for each name.
const FFMPEG_FILTER_PRESETS: Record<string, string | null> = {
  original: null,
  vivid: 'eq=saturation=1.45:contrast=1.12',
  bw: 'hue=s=0',
  warm: 'eq=gamma_r=1.08:gamma_b=0.92:saturation=1.06',
  cool: 'eq=gamma_b=1.1:gamma_r=0.93',
  fade: 'eq=contrast=0.75:brightness=0.05,curves=preset=vintage',
};

// asetrate+aresample changes pitch (and, as a side effect, speed) by
// resampling the audio's declared sample rate — a real, simple technique,
// not a true pitch-shift-while-preserving-tempo algorithm (that needs
// something like rubberband, which ffmpeg-static doesn't bundle). Honest
// approximation, same spirit as the filter presets above.
const VOICE_EFFECT_FILTERS: Record<string, string> = {
  chipmunk: 'asetrate=44100*1.6,aresample=44100',
  deep: 'asetrate=44100*0.78,aresample=44100',
  robot: 'flanger=delay=2:depth=2:speed=1:shape=triangular',
  echo: 'aecho=0.8:0.85:400:0.35',
};

// Background video rendering: an ffmpeg pipeline that turns a client-built
// edit plan (VideoProject.clips + music/filter/voice-effect/duet-stitch
// choices) into one real composited mp4, then publishes it as a
// Performance(mode: EDITED). Same "no Redis/BullMQ, single-concurrency
// in-memory FIFO" design as video-transcode.service, for the same reason —
// see that file's comment. A render is much heavier than a transcode job,
// so the single-concurrency limit matters even more here.
@Injectable()
export class VideoRenderService {
  private readonly logger = new Logger(VideoRenderService.name);
  private readonly queue: RenderJob[] = [];
  private processing = false;

  constructor(
    private prisma: PrismaService,
    private performances: PerformancesService,
  ) {}

  enqueue(projectId: string, publishStatus: 'DRAFT' | 'PUBLISHED'): void {
    this.queue.push({ projectId, publishStatus });
    void this.kick();
  }

  private async kick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      let job: RenderJob | undefined;
      while ((job = this.queue.shift())) {
        await this.runJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async runJob(job: RenderJob): Promise<void> {
    const tempFiles: string[] = [];
    try {
      const project = await this.prisma.videoProject.findUnique({ where: { id: job.projectId } });
      if (!project) return;

      const clips = (project.clips as unknown as EditPlanClip[]) ?? [];
      if (!clips.length) throw new Error('Project has no clips');

      // ── Stage 1: normalize + trim + speed + overlays, per clip ──────────
      const normalizedPaths: string[] = [];
      for (const clip of clips) {
        const p = await this.renderClip(clip, tempFiles);
        normalizedPaths.push(p);
      }

      // ── Stage 2: combine with per-boundary transitions (cut/fade/slide) ──
      const transitions: TransitionType[] = clips.slice(0, -1).map((c) => c.transitionOut ?? 'cut');
      const concatPath = await this.combineClips(normalizedPaths, transitions);
      tempFiles.push(concatPath);

      // ── Stage 3: voice effect + music mix ───────────────────────────────
      let musicUrl: string | null = null;
      if (project.musicSongId) {
        const song = await this.prisma.song.findUnique({ where: { id: project.musicSongId } });
        musicUrl = song?.audioUrl ?? null;
      }
      const composedPath = await this.composeAudio(concatPath, {
        voiceEffect: project.voiceEffect,
        filterPreset: project.filterPreset,
        musicUrl,
        musicOffsetMs: project.musicOffsetMs,
        musicVolume: project.musicVolume,
        tempFiles,
      });
      tempFiles.push(composedPath);

      // ── Stage 4: duet/stitch composite with an existing performance ─────
      let finalPath = composedPath;
      if (project.sourcePerformanceId && project.compositionMode) {
        const source = await this.prisma.performance.findUnique({ where: { id: project.sourcePerformanceId } });
        if (source) {
          finalPath = await this.composeWithSource(
            composedPath,
            source.videoUrl,
            project.compositionMode as 'DUET' | 'STITCH',
            tempFiles,
          );
          tempFiles.push(finalPath);
        }
      }

      // ── Upload + publish ─────────────────────────────────────────────────
      const finalBuffer = await fs.readFile(finalPath);
      const videoUrl = await uploadBufferToSupabase(finalBuffer, 'video/mp4', 'video-projects/renders');

      let thumbnailUrl: string | null = null;
      try {
        const thumbPath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-thumb.jpg`);
        tempFiles.push(thumbPath);
        await this.extractThumbnail(finalPath, thumbPath);
        const thumbBuffer = await fs.readFile(thumbPath);
        thumbnailUrl = await uploadBufferToSupabase(thumbBuffer, 'image/jpeg', 'video-projects/thumbnails');
      } catch (thumbErr) {
        this.logger.error(`Thumbnail generation failed for project ${job.projectId}: ${(thumbErr as Error)?.message}`);
      }

      const performance = await this.performances.createRenderedPerformance({
        userId: project.userId,
        songId: project.musicSongId,
        videoUrl,
        thumbnailUrl,
        caption: project.caption,
        status: job.publishStatus,
        sourcePerformanceId: project.sourcePerformanceId,
        compositionMode: project.compositionMode as 'DUET' | 'STITCH' | null,
      });

      await this.prisma.videoProject.update({
        where: { id: job.projectId },
        data: { status: 'READY', resultPerformanceId: performance.id },
      });
    } catch (err) {
      this.logger.error(`Render failed for project ${job.projectId}: ${(err as Error)?.message}`, (err as Error)?.stack);
      try {
        await this.prisma.videoProject.update({
          where: { id: job.projectId },
          data: { status: 'FAILED', errorMessage: (err as Error)?.message?.slice(0, 500) ?? 'Render failed' },
        });
      } catch {
        // swallow — the job already failed, this is just bookkeeping
      }
    } finally {
      await Promise.all(tempFiles.map((f) => fs.unlink(f).catch(() => undefined)));
    }
  }

  // ── Per-clip: trim + scale/crop to 1080x1920 + burn overlays + speed ────
  private async renderClip(clip: EditPlanClip, tempFiles: string[]): Promise<string> {
    const sourcePath = await this.downloadToTemp(clip.sourceUrl, 'mp4');
    tempFiles.push(sourcePath);

    const overlays = clip.overlays ?? [];
    const overlayPaths: string[] = [];
    for (const ov of overlays) {
      const p = await this.downloadToTemp(ov.imageUrl, 'png');
      overlayPaths.push(p);
      tempFiles.push(p);
    }

    const probe = await this.probe(sourcePath);
    const trimStartSec = clip.trimStartMs / 1000;
    const trimEndSec = clip.trimEndMs != null ? clip.trimEndMs / 1000 : probe.duration ?? trimStartSec + 1;
    const speed = Math.min(3, Math.max(0.3, clip.speed || 1));

    const filters: string[] = [];
    filters.push(
      `[0:v]trim=start=${trimStartSec}:end=${trimEndSec},setpts=PTS-STARTPTS,` +
        `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H},fps=${OUT_FPS}[base]`,
    );

    let lastLabel = 'base';
    overlays.forEach((ov, i) => {
      const inputIdx = i + 1; // input 0 is the source clip
      const targetW = Math.max(2, Math.round(ov.widthNorm * OUT_W));
      const x = Math.round(ov.xNorm * OUT_W);
      const y = Math.round(ov.yNorm * OUT_H);
      const startSec = Math.max(0, ov.startMs / 1000);
      const endSec = ov.endMs != null ? ov.endMs / 1000 : trimEndSec - trimStartSec;
      const scaledLabel = `ovs${i}`;
      const nextLabel = `c${i}`;
      filters.push(`[${inputIdx}:v]scale=${targetW}:-1[${scaledLabel}]`);
      filters.push(
        `[${lastLabel}][${scaledLabel}]overlay=x=${x}:y=${y}:enable='between(t,${startSec},${endSec})'[${nextLabel}]`,
      );
      lastLabel = nextLabel;
    });

    filters.push(speed !== 1 ? `[${lastLabel}]setpts=${(1 / speed).toFixed(6)}*PTS[vout]` : `[${lastLabel}]null[vout]`);
    const atempoChain = speed !== 1 ? buildAtempoChain(speed) : '';
    filters.push(
      `[0:a]atrim=start=${trimStartSec}:end=${trimEndSec},asetpts=PTS-STARTPTS` +
        (atempoChain ? `,${atempoChain}[aout]` : `[aout]`),
    );

    const outPath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-clip.mp4`);

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(sourcePath);
      overlayPaths.forEach((p) => cmd.input(p));
      cmd
        .complexFilter(filters.join(';'))
        .outputOptions([
          '-map', '[vout]',
          '-map', '[aout]',
          '-c:v', 'libx264',
          '-crf', '20',
          '-preset', 'veryfast',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
        ])
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outPath);
    });

    return outPath;
  }

  // ── Combine clips: concat for 'cut' boundaries, xfade/acrossfade for a
  // real crossfade/slide transition — mixed per-boundary, since each pair
  // of adjacent clips carries its own transitionOut choice. Always goes
  // through one filter_complex graph (not the old fast concat-demuxer path)
  // so a project with e.g. clip1--cut--clip2--fade--clip3 gets a hard cut
  // at the first boundary and a real crossfade at the second, in one pass.
  private async combineClips(clipPaths: string[], transitions: TransitionType[]): Promise<string> {
    const outPath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-combined.mp4`);

    if (clipPaths.length === 1) {
      // Still re-mux through ffmpeg (rather than just returning the path)
      // so downstream stages always see a fresh, independently-cleanable
      // temp file rather than aliasing one already in `tempFiles`.
      await new Promise<void>((resolve, reject) => {
        ffmpeg(clipPaths[0])
          .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
          .on('error', (err: Error) => reject(err))
          .on('end', () => resolve())
          .save(outPath);
      });
      return outPath;
    }

    const durations = await Promise.all(clipPaths.map((p) => this.probe(p).then((d) => d.duration ?? 1)));

    const filters: string[] = [];
    let curV = '0:v';
    let curA = '0:a';
    let curDur = durations[0];
    for (let i = 1; i < clipPaths.length; i++) {
      const transition = transitions[i - 1] ?? 'cut';
      const nextV = `${i}:v`;
      const nextA = `${i}:a`;
      const outV = `v${i}`;
      const outA = `a${i}`;
      if (transition === 'cut') {
        filters.push(`[${curV}][${nextV}]concat=n=2:v=1:a=0[${outV}]`);
        filters.push(`[${curA}][${nextA}]concat=n=2:v=0:a=1[${outA}]`);
        curDur = curDur + durations[i];
      } else {
        const dur = Math.max(0.1, Math.min(TRANSITION_DURATION_SEC, durations[i - 1], durations[i]));
        const offset = Math.max(0, curDur - dur);
        const xfadeType = transition === 'slide' ? 'slideleft' : 'fade';
        filters.push(`[${curV}][${nextV}]xfade=transition=${xfadeType}:duration=${dur.toFixed(3)}:offset=${offset.toFixed(3)}[${outV}]`);
        filters.push(`[${curA}][${nextA}]acrossfade=d=${dur.toFixed(3)}[${outA}]`);
        curDur = curDur + durations[i] - dur;
      }
      curV = outV;
      curA = outA;
    }

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg();
      clipPaths.forEach((p) => cmd.input(p));
      cmd
        .complexFilter(filters.join(';'))
        .outputOptions([
          '-map', `[${curV}]`,
          '-map', `[${curA}]`,
          '-c:v', 'libx264',
          '-crf', '20',
          '-preset', 'veryfast',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
        ])
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outPath);
    });
    return outPath;
  }

  // ── Voice effect + color filter + music mix ─────────────────────────────
  private async composeAudio(
    videoPath: string,
    opts: {
      voiceEffect: string | null;
      filterPreset: string | null;
      musicUrl: string | null;
      musicOffsetMs: number;
      musicVolume: number;
      tempFiles: string[];
    },
  ): Promise<string> {
    const probe = await this.probe(videoPath);
    const durationSec = probe.duration ?? 1;

    let musicPath: string | null = null;
    if (opts.musicUrl) {
      musicPath = await this.downloadToTemp(opts.musicUrl, 'mp3');
      opts.tempFiles.push(musicPath);
    }

    const videoFilter = opts.filterPreset ? FFMPEG_FILTER_PRESETS[opts.filterPreset] : null;
    const voiceFilter = opts.voiceEffect ? VOICE_EFFECT_FILTERS[opts.voiceEffect] : null;

    const filters: string[] = [];
    filters.push(videoFilter ? `[0:v]${videoFilter}[vout]` : `[0:v]null[vout]`);
    filters.push(voiceFilter ? `[0:a]${voiceFilter}[voice]` : `[0:a]anull[voice]`);

    if (musicPath) {
      const offsetSec = Math.max(0, opts.musicOffsetMs / 1000);
      const volume = Math.min(1, Math.max(0, opts.musicVolume ?? 1));
      filters.push(
        `[1:a]atrim=start=${offsetSec},asetpts=PTS-STARTPTS,volume=${volume},` +
          `apad,atrim=end=${durationSec},asetpts=PTS-STARTPTS[music]`,
      );
      filters.push(`[voice][music]amix=inputs=2:duration=first:normalize=0[aout]`);
    } else {
      filters.push(`[voice]anull[aout]`);
    }

    const outPath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-composed.mp4`);
    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(videoPath);
      if (musicPath) cmd.input(musicPath).inputOptions(['-stream_loop', '-1']);
      cmd
        .complexFilter(filters.join(';'))
        .outputOptions([
          '-map', '[vout]',
          '-map', '[aout]',
          // vout always comes out of the complexFilter graph (even the
          // no-op `null` filter) so it must always be re-encoded, never
          // stream-copied — "-c:v copy" on a filtergraph output is invalid.
          '-c:v', 'libx264',
          '-crf', '20',
          '-preset', 'veryfast',
          '-c:a', 'aac',
          '-b:a', '160k',
          '-shortest',
          '-movflags', '+faststart',
        ])
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outPath);
    });
    return outPath;
  }

  // ── Duet (side-by-side) / Stitch (sequential) with an existing performance
  private async composeWithSource(
    composedPath: string,
    sourceVideoUrl: string,
    mode: 'DUET' | 'STITCH',
    tempFiles: string[],
  ): Promise<string> {
    const sourcePath = await this.downloadToTemp(sourceVideoUrl, 'mp4');
    tempFiles.push(sourcePath);

    const outPath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-${mode.toLowerCase()}.mp4`);

    if (mode === 'DUET') {
      // Side by side, each half-width, cropped/scaled to fill; ends at the
      // shorter of the two rather than padding the other — a disclosed
      // simplification, not TikTok's exact behavior.
      const halfW = OUT_W / 2;
      const filters = [
        `[0:v]scale=${halfW}:${OUT_H}:force_original_aspect_ratio=increase,crop=${halfW}:${OUT_H},fps=${OUT_FPS}[left]`,
        `[1:v]scale=${halfW}:${OUT_H}:force_original_aspect_ratio=increase,crop=${halfW}:${OUT_H},fps=${OUT_FPS}[right]`,
        `[left][right]hstack=inputs=2[vout]`,
        `[0:a][1:a]amix=inputs=2:duration=shortest:normalize=0[aout]`,
      ].join(';');
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(sourcePath)
          .input(composedPath)
          .complexFilter(filters)
          .outputOptions([
            '-map', '[vout]', '-map', '[aout]',
            '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast',
            '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart',
          ])
          .on('error', (err: Error) => reject(err))
          .on('end', () => resolve())
          .save(outPath);
      });
    } else {
      // Stitch: normalize the source clip to the same encode, then
      // concat-demux source -> new composite, full clips (not TikTok's
      // "last ~5s of source" heuristic — a disclosed simplification).
      const normSourcePath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-stitch-src.mp4`);
      tempFiles.push(normSourcePath);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(sourcePath)
          .videoFilters(`scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H},fps=${OUT_FPS}`)
          .outputOptions(['-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'])
          .on('error', (err: Error) => reject(err))
          .on('end', () => resolve())
          .save(normSourcePath);
      });
      const listPath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-stitch-list.txt`);
      tempFiles.push(listPath);
      const listContent = [normSourcePath, composedPath].map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
      await fs.writeFile(listPath, listContent, 'utf-8');
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
          .on('error', (err: Error) => reject(err))
          .on('end', () => resolve())
          .save(outPath);
      });
    }

    return outPath;
  }

  // ── Shared helpers ───────────────────────────────────────────────────────
  private async downloadToTemp(url: string, ext: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url} (${res.status} ${res.statusText})`);
    const arrayBuffer = await res.arrayBuffer();
    const tempPath = path.join(os.tmpdir(), `${crypto.randomBytes(8).toString('hex')}-src.${ext}`);
    await fs.writeFile(tempPath, Buffer.from(arrayBuffer));
    return tempPath;
  }

  private probe(filePath: string): Promise<{ width?: number; height?: number; duration?: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return reject(err);
        const videoStream = data.streams.find((s) => s.codec_type === 'video');
        resolve({
          width: videoStream?.width,
          height: videoStream?.height,
          duration: data.format?.duration ? Number(data.format.duration) : undefined,
        });
      });
    });
  }

  private extractThumbnail(sourcePath: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .seekInput(0.1)
        .outputOptions(['-vframes', '1'])
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outPath);
    });
  }
}
