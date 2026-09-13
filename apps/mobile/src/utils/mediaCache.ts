// Lazy, self-cleaning on-device cache for remote image/video bytes,
// encrypted at rest — the media counterpart to apiCache.ts's JSON response
// cache. Reuses the exact same install-specific hardware-backed AES-256 key
// as secureLocalDb.ts (see that file: generated once per install, lives
// only in the OS Keychain/Keystore, never touches app code) so nothing
// other than this specific Guranda install can ever decrypt a cached byte.
// This is a pure optimization layered on top of `expo-file-system` — it
// must never throw, never block the caller, and never speculatively
// pre-fetch anything.
//
// Two independent namespaces, same machinery, different retention:
//  - DISCOVERY: 24h TTL, self-expires. `getCachedUri` — VideoCard.tsx and
//    VideoPlayerScreen.tsx already call this exactly like this, unchanged.
//  - CHAT: no TTL — a chat media bubble should stay available offline for
//    as long as the message exists, same as WhatsApp/Telegram/iMessage's
//    own local media cache. `getCachedChatMediaUri` for reads,
//    `evictChatMedia` for the one thing that DOES remove an entry: the
//    message it belongs to being deleted (wired into ChatScreen.tsx's
//    `message_deleted` handler).
//
// Uses the classic (`/legacy`) expo-file-system API (`cacheDirectory`,
// `downloadAsync`, `readDirectoryAsync`, `makeDirectoryAsync`,
// `deleteAsync`, `readAsStringAsync`, `writeAsStringAsync`) — SDK 56's
// default `expo-file-system` entrypoint is the new File/Directory
// class-based API, which doesn't expose these functions.
//
// Each namespace has two directories, two different guarantees:
//  - its cache dir: the real "at rest" store. Every byte written there is
//    AES encrypted; DISCOVERY's 24h TTL governs eviction there, CHAT's
//    entries live until evictChatMedia names them.
//  - its plaintext dir: a decrypted scratch copy, rebuilt on demand.
//    Hardware video decoders (and <Image>) need a real local file to
//    play/render from — not raw bytes sitting in JS memory — so a cache
//    hit decrypts once into here and hands back that file's URI. Wiped
//    alongside its encrypted counterpart on prune/evict/clear, and
//    sandboxed to this app like any other native app's media cache; the
//    thing actually protected against another app or a raw disk dump
//    reading it is the encrypted copy this gets rebuilt from.
import * as FileSystem from 'expo-file-system/legacy';
import { encryptBytes, decryptBytes } from './secureLocalDb';

interface CacheNamespace {
  cacheDir: string;
  plaintextDir: string;
  /** null = entries never expire on their own — only explicit eviction (evictChatMedia) or clearNamespace removes them. */
  ttlMs: number | null;
  dirsPromise: Promise<void> | null;
  inFlightDownloads: Set<string>;
}

function makeNamespace(name: string, ttlMs: number | null): CacheNamespace {
  return {
    cacheDir: `${FileSystem.cacheDirectory}${name}/`,
    plaintextDir: `${FileSystem.cacheDirectory}${name}-plaintext/`,
    ttlMs,
    dirsPromise: null,
    inFlightDownloads: new Set(),
  };
}

const DISCOVERY_NS = makeNamespace('media-cache', 24 * 60 * 60 * 1000); // 24 hours
const CHAT_NS = makeNamespace('chat-media-cache', null); // persists until the message is deleted

function ensureDirs(ns: CacheNamespace): Promise<void> {
  if (!ns.dirsPromise) {
    ns.dirsPromise = (async () => {
      for (const dir of [ns.cacheDir, ns.plaintextDir]) {
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
      }
    })().catch((err) => {
      // Allow a later call to retry directory creation instead of being
      // permanently stuck on a failed attempt.
      ns.dirsPromise = null;
      throw err;
    });
  }
  return ns.dirsPromise;
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

// base64 <-> raw bytes, dependency-free (Hermes ships no Buffer). Only used
// to bridge FileSystem's string-based read/write API and secureLocalDb's
// byte-based encrypt/decrypt API — never a security boundary itself.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? '=' : B64_CHARS[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? '=' : B64_CHARS[b2 & 63];
  }
  return out;
}
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const val = B64_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

async function downloadAndEncrypt(ns: CacheNamespace, remoteUrl: string, targetPath: string): Promise<void> {
  const tmpPlainPath = `${ns.plaintextDir}dl_${hashKey(remoteUrl)}_${Date.now()}.tmp`;
  try {
    await FileSystem.downloadAsync(remoteUrl, tmpPlainPath);
    const base64 = await FileSystem.readAsStringAsync(tmpPlainPath, { encoding: 'base64' });
    const combined = await encryptBytes(base64ToBytes(base64));
    await FileSystem.writeAsStringAsync(targetPath, combined, { encoding: 'utf8' });
  } finally {
    FileSystem.deleteAsync(tmpPlainPath, { idempotent: true }).catch(() => {});
  }
}

function startBackgroundDownload(ns: CacheNamespace, remoteUrl: string, targetPath: string): void {
  if (ns.inFlightDownloads.has(remoteUrl)) return;
  ns.inFlightDownloads.add(remoteUrl);
  (async () => {
    try {
      await ensureDirs(ns);
      await downloadAndEncrypt(ns, remoteUrl, targetPath);
    } catch {
      // Best-effort cache population only — never surfaced to callers.
    } finally {
      ns.inFlightDownloads.delete(remoteUrl);
    }
  })();
}

/** Decrypts the cached file at `encPath` into ns.plaintextDir (reusing an existing decrypted copy if one's already there) and returns its URI, or null if the encrypted entry can't be decrypted (corrupted, wrong/rotated key). */
async function decryptToPlaintextFile(ns: CacheNamespace, encPath: string, hash: string, ext: string): Promise<string | null> {
  const plainPath = `${ns.plaintextDir}${hash}.${ext}`;
  const info = await FileSystem.getInfoAsync(plainPath);
  if (info.exists) return plainPath;

  const combined = await FileSystem.readAsStringAsync(encPath, { encoding: 'utf8' });
  const bytes = await decryptBytes(combined);
  if (!bytes) return null;
  await FileSystem.writeAsStringAsync(plainPath, bytesToBase64(bytes), { encoding: 'base64' });
  return plainPath;
}

/**
 * Resolves `remoteUrl` to a local `file://` URI when a fresh cached+
 * encrypted copy already exists on disk (namespace-dependent: DISCOVERY
 * entries must be < 24h old, CHAT entries are valid until evicted).
 * Otherwise returns `remoteUrl` unchanged, immediately, and fires off a
 * background download+encrypt (not awaited) to populate the cache for next
 * time.
 *
 * Strictly lazy: nothing is cached until it has actually been requested via
 * this function once. Never throws — any filesystem/crypto error silently
 * falls back to returning `remoteUrl` with no background download attempted.
 */
async function resolveCachedUri(ns: CacheNamespace, remoteUrl: string): Promise<string> {
  if (!remoteUrl) return remoteUrl;

  try {
    const hash = hashKey(remoteUrl);
    const prefix = `${hash}_`;

    await ensureDirs(ns);

    const entries = await FileSystem.readDirectoryAsync(ns.cacheDir);
    const match = entries.find((name) => name.startsWith(prefix));

    if (match) {
      const rest = match.slice(prefix.length);
      const timestamp = parseInt(rest.split('.')[0], 10);
      const fresh = ns.ttlMs === null || (!isNaN(timestamp) && Date.now() - timestamp < ns.ttlMs);
      if (fresh) {
        const plainUri = await decryptToPlaintextFile(ns, `${ns.cacheDir}${match}`, hash, extractExt(remoteUrl));
        if (plainUri) return plainUri;
        // Decrypt failed (corrupted entry, or a key rotation) — evict and
        // fall through to a fresh download below, same as an expired entry.
      }
      // Stale or undecryptable — evict it (self-cleaning, no separate sweep job needed).
      FileSystem.deleteAsync(`${ns.cacheDir}${match}`, { idempotent: true }).catch(() => {});
    }

    const targetPath = `${ns.cacheDir}${hash}_${Date.now()}.${extractExt(remoteUrl)}`;
    startBackgroundDownload(ns, remoteUrl, targetPath);
    return remoteUrl;
  } catch {
    return remoteUrl;
  }
}

async function pruneNamespace(ns: CacheNamespace): Promise<void> {
  if (ns.ttlMs === null) return; // nothing self-expires in a persistent namespace
  try {
    await ensureDirs(ns);
    const entries = await FileSystem.readDirectoryAsync(ns.cacheDir);
    for (const name of entries) {
      const underscoreIdx = name.indexOf('_');
      if (underscoreIdx === -1) continue;
      const hash = name.slice(0, underscoreIdx);
      const rest = name.slice(underscoreIdx + 1);
      const timestamp = parseInt(rest.split('.')[0], 10);
      if (isNaN(timestamp) || Date.now() - timestamp >= ns.ttlMs) {
        await evictHash(ns, hash, name);
      }
    }
  } catch {
    // Best-effort hygiene — never worth surfacing to the user.
  }
}

async function evictHash(ns: CacheNamespace, hash: string, cacheFileName: string): Promise<void> {
  FileSystem.deleteAsync(`${ns.cacheDir}${cacheFileName}`, { idempotent: true }).catch(() => {});
  const plainEntries = await FileSystem.readDirectoryAsync(ns.plaintextDir).catch(() => [] as string[]);
  const plainMatch = plainEntries.find((p) => p.startsWith(`${hash}.`));
  if (plainMatch) FileSystem.deleteAsync(`${ns.plaintextDir}${plainMatch}`, { idempotent: true }).catch(() => {});
}

/** Removes the one cached entry for `remoteUrl` from `ns` (encrypted + decrypted-scratch), if present. Never throws. */
async function evictUrl(ns: CacheNamespace, remoteUrl: string): Promise<void> {
  if (!remoteUrl) return;
  try {
    await ensureDirs(ns);
    const hash = hashKey(remoteUrl);
    const prefix = `${hash}_`;
    const entries = await FileSystem.readDirectoryAsync(ns.cacheDir);
    const match = entries.find((name) => name.startsWith(prefix));
    if (match) await evictHash(ns, hash, match);
  } catch {
    // Best-effort — a failed evict just means the entry outlives its message locally.
  }
}

async function clearNamespace(ns: CacheNamespace): Promise<void> {
  try {
    await FileSystem.deleteAsync(ns.cacheDir, { idempotent: true });
    await FileSystem.deleteAsync(ns.plaintextDir, { idempotent: true });
  } catch {
    // Best-effort.
  } finally {
    ns.dirsPromise = null;
  }
}

// ── Discovery/Explore media — 24h TTL ───────────────────────────────────

export async function getCachedUri(remoteUrl: string): Promise<string> {
  return resolveCachedUri(DISCOVERY_NS, remoteUrl);
}

/** Sweeps every DISCOVERY entry whose 24h TTL has passed, plus its decrypted scratch copy if one exists. Safe to call opportunistically (e.g. app foreground) — cheap no-op when nothing's expired. */
export async function pruneExpiredMedia(): Promise<void> {
  return pruneNamespace(DISCOVERY_NS);
}

/** Wipes every DISCOVERY entry (encrypted + decrypted-scratch). For logout/account-switch, matching clearApiCache/clearSecureStore's own scope. */
export async function clearMediaCache(): Promise<void> {
  return clearNamespace(DISCOVERY_NS);
}

// ── Chat media — persists until the message it belongs to is deleted ───

/**
 * Same contract as getCachedUri, but for chat attachments: once cached, an
 * entry stays available offline indefinitely — there's no TTL to age it
 * out. The only thing that removes it is evictChatMedia (call it when the
 * message carrying this URL is deleted) or clearChatMediaCache.
 */
export async function getCachedChatMediaUri(remoteUrl: string): Promise<string> {
  return resolveCachedUri(CHAT_NS, remoteUrl);
}

/** Removes one chat attachment's cached copy — call this when the message that carries `remoteUrl` is deleted (for everyone or for me), so a deleted message's media doesn't keep living on disk. Never throws. */
export async function evictChatMedia(remoteUrl: string): Promise<void> {
  return evictUrl(CHAT_NS, remoteUrl);
}

/** Wipes every cached chat attachment (encrypted + decrypted-scratch). For logout/account-switch. */
export async function clearChatMediaCache(): Promise<void> {
  return clearNamespace(CHAT_NS);
}
