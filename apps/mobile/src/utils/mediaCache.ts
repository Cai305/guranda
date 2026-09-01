// Lazy, self-cleaning 3-day on-device cache for Discovery video/thumbnail
// media. This is a pure optimization layered on top of `expo-file-system` —
// it must never throw, never block the caller, and never speculatively
// pre-fetch anything. See `getCachedUri` below for the contract.
//
// Uses the classic (`/legacy`) expo-file-system API (`cacheDirectory`,
// `downloadAsync`, `readDirectoryAsync`, `makeDirectoryAsync`,
// `deleteAsync`) — SDK 56's default `expo-file-system` entrypoint is the new
// File/Directory class-based API, which doesn't expose these functions.
import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = `${FileSystem.cacheDirectory}media-cache/`;
const TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// URLs currently being downloaded in the background, so rapid re-renders /
// fast re-navigation don't spawn duplicate downloads of the same file.
const inFlightDownloads = new Set<string>();

// Memoized so concurrent callers (e.g. a Promise.all resolving url + poster
// + renditions at once) all await the same directory-creation attempt
// instead of racing separate makeDirectoryAsync calls.
let cacheDirPromise: Promise<void> | null = null;

function ensureCacheDir(): Promise<void> {
  if (!cacheDirPromise) {
    cacheDirPromise = (async () => {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    })().catch((err) => {
      // Allow a later call to retry directory creation instead of being
      // permanently stuck on a failed attempt.
      cacheDirPromise = null;
      throw err;
    });
  }
  return cacheDirPromise;
}

/** Simple, fast, non-cryptographic string hash (djb2) — this is a cache key, not a security boundary. */
function hashKey(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0; // hash * 33 + c
  }
  return (hash >>> 0).toString(36); // unsigned, compact, filesystem-safe
}

/** Best-effort file extension from a URL's path, ignoring query/hash — falls back to a generic one. */
function extractExt(remoteUrl: string): string {
  try {
    const clean = remoteUrl.split('?')[0].split('#')[0];
    const last = clean.substring(clean.lastIndexOf('/') + 1);
    const dot = last.lastIndexOf('.');
    if (dot > -1) {
      const ext = last.substring(dot + 1);
      if (/^[a-zA-Z0-9]{1,8}$/.test(ext)) return ext;
    }
  } catch {
    // fall through to default
  }
  return 'cache';
}

function startBackgroundDownload(remoteUrl: string, targetPath: string): void {
  if (inFlightDownloads.has(remoteUrl)) return;
  inFlightDownloads.add(remoteUrl);
  (async () => {
    try {
      await ensureCacheDir();
      await FileSystem.downloadAsync(remoteUrl, targetPath);
    } catch {
      // Best-effort cache population only — never surfaced to callers.
    } finally {
      inFlightDownloads.delete(remoteUrl);
    }
  })();
}

/**
 * Resolves `remoteUrl` to a local `file://` URI when a fresh (< 3 day old)
 * cached copy already exists on disk. Otherwise returns `remoteUrl`
 * unchanged, immediately, and fires off a background download (not awaited)
 * to populate the cache for next time.
 *
 * Strictly lazy: nothing is cached until it has actually been requested via
 * this function once. Never throws — any filesystem error silently falls
 * back to returning `remoteUrl` with no background download attempted.
 */
export async function getCachedUri(remoteUrl: string): Promise<string> {
  if (!remoteUrl) return remoteUrl;

  try {
    const hash = hashKey(remoteUrl);
    const prefix = `${hash}_`;

    await ensureCacheDir();

    const entries = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const match = entries.find((name) => name.startsWith(prefix));

    if (match) {
      const rest = match.slice(prefix.length);
      const timestamp = parseInt(rest.split('.')[0], 10);
      if (!isNaN(timestamp) && Date.now() - timestamp < TTL_MS) {
        return `${CACHE_DIR}${match}`;
      }
      // Stale copy — evict it (self-cleaning, no separate sweep job needed).
      FileSystem.deleteAsync(`${CACHE_DIR}${match}`, { idempotent: true }).catch(() => {});
    }

    const targetPath = `${CACHE_DIR}${hash}_${Date.now()}.${extractExt(remoteUrl)}`;
    startBackgroundDownload(remoteUrl, targetPath);
    return remoteUrl;
  } catch {
    return remoteUrl;
  }
}
