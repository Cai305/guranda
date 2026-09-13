import { useEffect, useState } from 'react';
import { getCachedChatMediaUri } from '../utils/mediaCache';

/**
 * Resolves a chat attachment URL through the persistent (no-TTL) on-device
 * cache — unlike useCachedMedia's 24h Discovery cache, an entry here stays
 * available offline for as long as the message carrying it exists; it's
 * only removed when that message is deleted (see ChatScreen.tsx's
 * message_deleted handler, which calls evictChatMedia). Same
 * render-immediately-then-swap contract as useCachedMedia: starts with the
 * real remote URL so the first paint never blocks on disk I/O.
 */
export function useCachedChatMedia(url: string | null | undefined): string | null {
  const [uri, setUri] = useState<string | null>(url ?? null);

  useEffect(() => {
    setUri(url ?? null);
    if (!url) return;
    let cancelled = false;
    getCachedChatMediaUri(url).then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => { cancelled = true; };
  }, [url]);

  return uri;
}
