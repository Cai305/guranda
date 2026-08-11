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
