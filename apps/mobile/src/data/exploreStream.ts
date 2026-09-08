import { PostDto } from '@mxit2/types';
import { fetchApi } from '../utils/api';
import { ChallengeSummary } from '../components/ChallengeCard';
import { VideoMeta } from '../components/VideoCard';
import { LifeModule } from '../config/modules';
import { RealLiveStream, fetchLiveRooms } from './liveApi';

const FEED_PAGE_SIZE = 20;
const CHALLENGES_PAGE_SIZE = 20;

// One momentum stream mixing everything real — posts, challenges, live
// streams, videos, mini apps — instead of fixed, siloed tabs. Shared by
// ExploreScreen's "All" tab (a scrolling list of these) and
// ImmersiveFeedScreen (the same items, one full-screen swipe per item) —
// both are just different presentations of one mixed stream, so the mixing
// algorithm and its continuation fetches live here once, not twice.
export type StreamItem =
  | { kind: 'post'; key: string; data: PostDto }
  | { kind: 'challenge'; key: string; data: ChallengeSummary }
  | { kind: 'live'; key: string; data: RealLiveStream }
  | { kind: 'video'; key: string; data: VideoMeta }
  | { kind: 'miniapp'; key: string; data: LifeModule };

// ── The mixing algorithm ─────────────────────────────────────────────────
// Each source (posts, challenges, live, videos) arrives already ranked by
// its own real momentum signal server-side — trending.service.ts's own
// comment explains why they're independently-ranked lists, not one merged/
// score-normalized list. This function's only job is deciding *how often*
// each type gets a turn, never re-ordering within a type (that would throw
// away real signal for nothing).
//
// SLOT_PATTERN is a fixed-length "menu" of 12 turns: mostly posts (the
// deep, ever-renewing backbone of the feed) with challenge/video/live/
// mini-app "spice" spread through it at irregular gaps (2, 3, 4, 2 slots
// apart) rather than one evenly-spaced type per N — an evenly-spaced
// pattern reads as robotic within a couple of screens; irregular gaps
// don't, even though the algorithm itself is still fully deterministic.
// Deterministic matters here: the function is a pure map from the 5 input
// arrays to a stream — as long as items are only ever appended to the *end*
// of a source array (never reordered/removed), re-running it after a
// pagination fetch reproduces the exact same prefix plus new items tacked
// on, so nothing already on screen ever jumps around under the user.
export const SLOT_PATTERN: StreamItem['kind'][] = [
  'post', 'post', 'challenge', 'post', 'video', 'post',
  'post', 'live', 'post', 'miniapp', 'post', 'post',
];

export interface AllStreamResult {
  items: StreamItem[];
  // Which types ran out of supply before the pattern did — the caller uses
  // this to decide which pools to actually fetch more of, instead of
  // blindly re-fetching every type on every scroll.
  exhausted: Set<StreamItem['kind']>;
}

export function buildAllStream(
  posts: PostDto[],
  challenges: ChallengeSummary[],
  live: RealLiveStream[],
  videos: VideoMeta[],
  miniApps: LifeModule[],
): AllStreamResult {
  const items: StreamItem[] = [];
  const exhausted = new Set<StreamItem['kind']>();
  let pi = 0, ci = 0, li = 0, vi = 0, ai = 0;
  const cappedApps = miniApps.slice(0, 4);

  const tryPlace = (kind: StreamItem['kind']): boolean => {
    switch (kind) {
      case 'post': if (pi < posts.length) { items.push({ kind: 'post', key: `p-${posts[pi].id}`, data: posts[pi] }); pi++; return true; } return false;
      case 'challenge': if (ci < challenges.length) { items.push({ kind: 'challenge', key: `c-${challenges[ci].id}`, data: challenges[ci] }); ci++; return true; } return false;
      case 'video': if (vi < videos.length) { items.push({ kind: 'video', key: `v-${videos[vi].id}`, data: videos[vi] }); vi++; return true; } return false;
      case 'live': if (li < live.length) { items.push({ kind: 'live', key: `l-${live[li].id}`, data: live[li] }); li++; return true; } return false;
      case 'miniapp': if (ai < cappedApps.length) { items.push({ kind: 'miniapp', key: `m-${cappedApps[ai].id}`, data: cappedApps[ai] }); ai++; return true; } return false;
    }
  };

  const remaining = () => pi < posts.length || ci < challenges.length || vi < videos.length || li < live.length || ai < cappedApps.length;
  let slot = 0;
  while (remaining()) {
    const want = SLOT_PATTERN[slot % SLOT_PATTERN.length];
    if (!tryPlace(want)) {
      exhausted.add(want);
      // That type's pool ran dry for now — fall through to whichever type
      // still has supply, in the same priority order every time, so the
      // stream never stalls just because one source is temporarily out.
      (['post', 'challenge', 'video', 'live', 'miniapp'] as const).some((k) => tryPlace(k));
    }
    slot++;
  }
  return { items, exhausted };
}

// ── Continuation fetchers ────────────────────────────────────────────────
// Each draws from a DIFFERENT ranking than whatever seeded a caller's
// initial snapshot (momentum/views/viewer-count vs. these sources' own
// ordering), so results can legitimately overlap what's already shown —
// every one de-dupes against a `seen` id set the caller owns and mutates
// across calls, rather than assuming the sources are disjoint. Callers
// (ExploreScreen's "All" tab, ImmersiveFeedScreen) each keep their own
// cursor/seen state — these functions are pure request/response, no
// module-level state, so two callers never cross-contaminate.

export async function fetchMorePosts(cursor: string | null, seen: Set<string>): Promise<{ items: PostDto[]; nextCursor: string | null }> {
  const qs = cursor ? `?take=${FEED_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}` : `?take=${FEED_PAGE_SIZE}`;
  const res = await fetchApi(`/posts${qs}`);
  if (!res.ok) return { items: [], nextCursor: cursor };
  const data: { posts: PostDto[]; nextCursor: string | null } = await res.json();
  const fresh = data.posts.filter((p) => !seen.has(p.id));
  fresh.forEach((p) => seen.add(p.id));
  return { items: fresh, nextCursor: data.nextCursor };
}

export async function fetchMoreChallenges(skip: number, seen: Set<string>): Promise<{ items: ChallengeSummary[]; nextSkip: number; hasMore: boolean }> {
  const res = await fetchApi(`/challenges?take=${CHALLENGES_PAGE_SIZE}&skip=${skip}`);
  if (!res.ok) return { items: [], nextSkip: skip, hasMore: false };
  const data: ChallengeSummary[] = await res.json();
  const fresh = data.filter((c) => !seen.has(c.id));
  fresh.forEach((c) => seen.add(c.id));
  return { items: fresh, nextSkip: skip + data.length, hasMore: data.length === CHALLENGES_PAGE_SIZE };
}

export async function fetchMoreVideos(cursor: string | null, seen: Set<string>): Promise<{ items: VideoMeta[]; nextCursor: string | null }> {
  const qs = cursor ? `?take=20&cursor=${encodeURIComponent(cursor)}` : '?take=20';
  const res = await fetchApi(`/videos/feed${qs}`);
  if (!res.ok) return { items: [], nextCursor: cursor };
  const data: { videos: VideoMeta[]; nextCursor: string | null } = await res.json();
  const fresh = data.videos.filter((v) => !seen.has(v.id));
  fresh.forEach((v) => seen.add(v.id));
  return { items: fresh, nextCursor: data.nextCursor };
}

// /live/rooms is already the full, uncapped listing — "more" here just
// means re-pulling it and revealing whatever wasn't already shown, not
// real cursor pagination (see live.service.ts's listLive: "doesn't
// truncate").
export async function fetchMoreLive(seen: Set<string>): Promise<{ items: RealLiveStream[] }> {
  const rooms = await fetchLiveRooms();
  const fresh = rooms.filter((l) => !seen.has(l.id));
  fresh.forEach((l) => seen.add(l.id));
  return { items: fresh };
}
