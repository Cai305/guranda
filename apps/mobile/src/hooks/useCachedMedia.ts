import { useEffect, useState } from 'react';
import { getCachedUri } from '../utils/mediaCache';

/**
 * Resolves a remote image/video URL through the encrypted 24h on-device
 * cache (see utils/mediaCache.ts — the same cache VideoCard/VideoPlayerScreen
 * already use). Always renders something immediately — starts with the real
 * remote URL so the first paint never blocks on disk I/O, then swaps to the
 * cached/decrypted local URI once it resolves (instant on a cache hit; on a
 * miss the swap happens once the background download finishes, same as
 * getCachedUri's own contract).
 */
export function useCachedMedia(url: string | null | undefined): string | null {
  const [uri, setUri] = useState<string | null>(url ?? null);

  useEffect(() => {
    setUri(url ?? null);
    if (!url) return;
    let cancelled = false;
    getCachedUri(url).then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => { cancelled = true; };
  }, [url]);

  return uri;
}
