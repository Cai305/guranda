import { Platform } from 'react-native';
import { uploadMedia } from './api';

// Extracts a frame near the very start of a video and uploads it as the
// video's poster — same idea as YouTube always having a static thumbnail
// instead of a blank box before you hit play. Non-fatal by design: every
// failure path resolves to null rather than throwing, since a missing
// thumbnail should never block a video upload/post from going through.

/**
 * Native (iOS/Android): expo-video-thumbnails grabs a frame via the
 * platform's own video decoder — dynamically imported so this file (and
 * therefore uploadMedia, which the web CreatePostScreen flow also uses)
 * doesn't drag in a native-only module on web bundles.
 */
async function extractFrameNative(uri: string): Promise<string | null> {
  try {
    const VideoThumbnails = await import('expo-video-thumbnails');
    // 100ms in, not 0 — many encoders emit a black/blank keyframe at
    // exactly t=0, so a true frame-0 grab is often a solid black square.
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 100, quality: 0.8 });
    return thumbUri;
  } catch (e) {
    console.warn('extractFrameNative failed:', e);
    return null;
  }
}

/**
 * Web: expo-video-thumbnails has no web implementation, so this draws the
 * frame into a <canvas> via a hidden <video> element instead — the
 * standard browser technique, and what actually runs when this app is
 * served as a web app (including production).
 */
function extractFrameWeb(uri: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => { video.removeAttribute('src'); video.load(); };
      const fail = () => { cleanup(); resolve(null); };

      video.onloadedmetadata = () => {
        // Same "just past zero" reasoning as the native path above.
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (!ctx) return fail();
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            cleanup();
            if (!blob) { resolve(null); return; }
            resolve(URL.createObjectURL(blob));
          }, 'image/jpeg', 0.8);
        } catch {
          fail();
        }
      };
      video.onerror = fail;
      video.src = uri;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates a poster frame for `videoUri` and uploads it, returning the
 * hosted thumbnail URL — or null if extraction/upload failed for any
 * reason (caller should just proceed without a thumbnailUrl in that case).
 */
export async function generateVideoThumbnail(videoUri: string): Promise<string | null> {
  const localFrameUri = Platform.OS === 'web' ? await extractFrameWeb(videoUri) : await extractFrameNative(videoUri);
  if (!localFrameUri) return null;
  try {
    const { url } = await uploadMedia(localFrameUri, 'image');
    return url;
  } catch (e) {
    console.warn('Thumbnail upload failed:', e);
    return null;
  } finally {
    if (Platform.OS === 'web' && localFrameUri.startsWith('blob:')) {
      URL.revokeObjectURL(localFrameUri);
    }
  }
}

/**
 * Web filmstrip: seeks one hidden <video> element to `count` evenly-spaced
 * times across the clip and captures each as its own canvas frame — a real
 * per-position frame, not one thumbnail stretched across the whole clip's
 * timeline width (which is what a single generateVideoThumbnail() call
 * would look like if reused for a multi-frame strip).
 */
function extractFilmstripWeb(uri: string, count: number, durationSec: number): Promise<string[]> {
  return new Promise((resolve) => {
    const frames: string[] = [];
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      const canvas = document.createElement('canvas');
      let i = 0;

      const finish = () => { video.removeAttribute('src'); video.load(); resolve(frames); };
      const captureNext = () => {
        if (i >= count) return finish();
        const t = durationSec > 0 ? (durationSec * (i + 0.5)) / count : 0;
        video.currentTime = Math.min(Math.max(t, 0.05), Math.max(durationSec - 0.05, 0.05));
      };

      video.onloadedmetadata = () => {
        canvas.width = 90;
        canvas.height = Math.round((video.videoHeight / (video.videoWidth || 1)) * 90) || 160;
        captureNext();
      };
      video.onseeked = () => {
        try {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.6));
          }
        } catch {
          // skip this frame, keep going
        }
        i += 1;
        captureNext();
      };
      video.onerror = finish;
      video.src = uri;
    } catch {
      resolve(frames);
    }
  });
}

/**
 * Native filmstrip: expo-video-thumbnails supports an arbitrary `time`, so
 * this just calls it `count` times at evenly-spaced offsets — no separate
 * native filmstrip API needed.
 */
async function extractFilmstripNative(uri: string, count: number, durationMs: number): Promise<string[]> {
  try {
    const VideoThumbnails = await import('expo-video-thumbnails');
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = durationMs > 0 ? Math.round((durationMs * (i + 0.5)) / count) : 100;
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: Math.max(t, 50), quality: 0.5 });
        frames.push(thumbUri);
      } catch {
        // skip this frame, keep going
      }
    }
    return frames;
  } catch (e) {
    console.warn('extractFilmstripNative failed:', e);
    return [];
  }
}

/**
 * Local-only filmstrip frames for a clip's timeline segment — never
 * uploaded (these are purely a client-side editing aid), unlike
 * generateVideoThumbnail's single poster frame.
 */
export async function generateFilmstrip(videoUri: string, count: number, durationMs: number): Promise<string[]> {
  if (count <= 0) return [];
  return Platform.OS === 'web'
    ? extractFilmstripWeb(videoUri, count, durationMs / 1000)
    : extractFilmstripNative(videoUri, count, durationMs);
}
