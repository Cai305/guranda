import { secureGet, secureSet, secureRemove, clearSecureKeysWithPrefix } from './secureLocalDb';

// GET-response cache for fetchApi (utils/api.ts) — same external shape as
// before, now backed by secureLocalDb instead of plain AsyncStorage, so
// every cached response is encrypted at rest (see secureLocalDb.ts for the
// key model) instead of sitting as a readable JSON blob on disk.
const CACHE_PREFIX = 'api_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  timestamp: number;
  data: any;
}

export async function getCachedResponse(endpoint: string): Promise<any | null> {
  const cached = await secureGet<CacheEntry>(`${CACHE_PREFIX}${endpoint}`);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > DEFAULT_TTL) {
    // Expired, clean it up asynchronously
    secureRemove(`${CACHE_PREFIX}${endpoint}`).catch(() => {});
    return null;
  }

  return cached.data;
}

// Stale-while-revalidate variant for fetchApi — unlike getCachedResponse
// above (which drops anything past DEFAULT_TTL so the caller falls through
// to a blocking network fetch), this NEVER discards a cached entry just for
// being old: it always hands back what's on disk instantly and flags
// whether it's stale, so the caller can serve it immediately while quietly
// refreshing in the background instead of ever blocking a screen on the
// network just because the local copy aged past 5 minutes.
export async function getCachedEntry(endpoint: string): Promise<{ data: any; isStale: boolean } | null> {
  const cached = await secureGet<CacheEntry>(`${CACHE_PREFIX}${endpoint}`);
  if (!cached) return null;
  return { data: cached.data, isStale: Date.now() - cached.timestamp > DEFAULT_TTL };
}

export async function setCachedResponse(endpoint: string, data: any): Promise<void> {
  await secureSet(`${CACHE_PREFIX}${endpoint}`, { timestamp: Date.now(), data });
}

export async function invalidateCachedResponse(endpoint: string): Promise<void> {
  await secureRemove(`${CACHE_PREFIX}${endpoint}`);
}

export async function clearApiCache(): Promise<void> {
  await clearSecureKeysWithPrefix(CACHE_PREFIX);
}
