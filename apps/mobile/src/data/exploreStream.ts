import { PostDto, CampaignDto } from '@mxit2/types';
import { fetchApi } from '../utils/api';
import { ChallengeSummary } from '../components/ChallengeCard';
import { VideoMeta } from '../components/VideoCard';
import { EventCardData } from '../components/cards/EventMiniCard';
import { LifeModule } from '../config/modules';
import { RealLiveStream, fetchLiveRooms } from './liveApi';

const FEED_PAGE_SIZE = 20;
const CHALLENGES_PAGE_SIZE = 20;
const EVENTS_PAGE_SIZE = 20;
const ADS_PAGE_SIZE = 10;

// A "Sync" post — someone performing to a song (Song Sync / Karaoke / Add
// Song After), published from CreateLipSyncScreen's flow. Shape mirrors
// GET /performances/feed's response 1:1.
export interface PerformanceItem {
  id: string;
  mode: 'SONG_SYNC' | 'KARAOKE' | 'ADD_AFTER' | 'EDITED';
  videoUrl: string;
  thumbnailUrl: string | null;
  offsetMs: number;
  caption: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  // EDITED performances may carry no song at all (attribution-only when present).
  song: { id: string; title: string; artistName: string; audioUrl: string; coverUrl: string | null; durationSeconds: number } | null;
  sourcePerformanceId?: string | null;
  compositionMode?: 'DUET' | 'STITCH' | null;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
}

// A flattened status/story item — GET /stories/feed groups stories by
// author (for the "who has stories" ring row); the mixed stream wants one
// feed-item per story instead, so fetchMoreStatuses flattens those groups.
export interface StatusItem {
  id: string;
  author: { id: string; username: string; displayName?: string; avatarUrl?: string };
  mediaUrl?: string | null;
  textContent?: string | null;
  backgroundColor?: string | null;
  createdAt: string;
  expiresAt: string;
  viewedByMe?: boolean;
}

// One momentum stream mixing everything real — posts, challenges, live
// streams, videos, mini apps, status/stories, events and sponsored
// campaigns — instead of fixed, siloed tabs. Shared by ExploreScreen's
// "All" tab (a scrolling list of these) and ImmersiveFeedScreen (the same
// items, one full-screen swipe per item) — both are just different
// presentations of one mixed stream, so the mixing algorithm and its
// continuation fetches live here once, not twice.
export type StreamItem =
  | { kind: 'post'; key: string; data: PostDto }
  | { kind: 'challenge'; key: string; data: ChallengeSummary }
  | { kind: 'live'; key: string; data: RealLiveStream }
  | { kind: 'video'; key: string; data: VideoMeta }
  | { kind: 'miniapp'; key: string; data: LifeModule }
  | { kind: 'status'; key: string; data: StatusItem }
  | { kind: 'event'; key: string; data: EventCardData }
  | { kind: 'ad'; key: string; data: CampaignDto }
  | { kind: 'performance'; key: string; data: PerformanceItem };

// ── The mixing algorithm ─────────────────────────────────────────────────
// Each source (posts, challenges, live, videos, ...) arrives already ranked
// by its own real momentum/personalization signal server-side —
// trending.service.ts's own comment explains why they're independently-
// ranked lists, not one merged/score-normalized list, and posts.service.ts's
// ContentRankingService already personalizes *within* a type by recency +
// reputation + proximity. This function's only job is deciding *how often*
// each type gets a turn relative to the others — "who gets how much of the
// stream" at the type level — never re-ordering within a type, which would
// throw away that real signal for nothing.
//
// KIND_WEIGHTS is the tunable "how many times" knob: posts dominate (the
// deep, ever-renewing backbone), ads get the smallest share — sponsored
// content earns a place, never a takeover. Nothing else in this file
// encodes frequency; change the ratio here and the whole stream re-balances.
const KIND_WEIGHTS: Record<StreamItem['kind'], number> = {
  post: 8, video: 3, challenge: 2, live: 2, status: 2, performance: 2, miniapp: 1, event: 1, ad: 1,
};
const KINDS = Object.keys(KIND_WEIGHTS) as StreamItem['kind'][];

export interface AllStreamResult {
  items: StreamItem[];
  // Which types ran out of currently-loaded supply — the caller uses this to
  // decide which pools to actually fetch more of, instead of blindly
  // re-fetching every type on every scroll. buildAllStream always places
  // every item every source currently holds (it's a full re-mix of what's
  // loaded so far, not a windowed slice), so by construction this is every
  // kind once the loop below finishes.
  exhausted: Set<StreamItem['kind']>;
}

export function buildAllStream(
  posts: PostDto[],
  challenges: ChallengeSummary[],
  live: RealLiveStream[],
  videos: VideoMeta[],
  miniApps: LifeModule[],
  statuses: StatusItem[],
  events: EventCardData[],
  ads: CampaignDto[],
  performances: PerformanceItem[] = [],
): AllStreamResult {
  const items: StreamItem[] = [];
  const cappedApps = miniApps.slice(0, 4);
  const pools: Record<StreamItem['kind'], number> = {
    post: posts.length, challenge: challenges.length, video: videos.length, live: live.length,
    miniapp: cappedApps.length, status: statuses.length, event: events.length, ad: ads.length,
    performance: performances.length,
  };
  let pi = 0, ci = 0, li = 0, vi = 0, ai = 0, si = 0, ei = 0, adi = 0, pfi = 0;

  const place = (kind: StreamItem['kind']) => {
    switch (kind) {
      case 'post': items.push({ kind: 'post', key: `p-${posts[pi].id}`, data: posts[pi] }); pi++; break;
      case 'challenge': items.push({ kind: 'challenge', key: `c-${challenges[ci].id}`, data: challenges[ci] }); ci++; break;
      case 'video': items.push({ kind: 'video', key: `v-${videos[vi].id}`, data: videos[vi] }); vi++; break;
      case 'live': items.push({ kind: 'live', key: `l-${live[li].id}`, data: live[li] }); li++; break;
      case 'miniapp': items.push({ kind: 'miniapp', key: `m-${cappedApps[ai].id}`, data: cappedApps[ai] }); ai++; break;
      case 'status': items.push({ kind: 'status', key: `s-${statuses[si].id}`, data: statuses[si] }); si++; break;
      case 'event': items.push({ kind: 'event', key: `e-${events[ei].id}`, data: events[ei] }); ei++; break;
      case 'ad': items.push({ kind: 'ad', key: `ad-${ads[adi].id}`, data: ads[adi] }); adi++; break;
      case 'performance': items.push({ kind: 'performance', key: `pf-${performances[pfi].id}`, data: performances[pfi] }); pfi++; break;
    }
    pools[kind]--;
  };

  // Smooth Weighted Round Robin — the same algorithm load balancers use to
  // spread requests across weighted backends without bursts. Every turn,
  // each kind that still has supply accrues `current` by its own weight;
  // whichever kind is most "overdue" relative to its target share wins the
  // turn, then pays back the combined weight of everything currently in
  // play. A kind with nothing left can never win a turn, so — unlike a
  // fixed slot pattern with a fallback priority list — the stream can't
  // degenerate into a run of one type just because several others are
  // temporarily dry; scarce kinds still land, just spaced out fairly
  // instead of clumped. Fully deterministic: no randomness, so re-running
  // this after a pagination fetch is still a pure function of the pools.
  const current: Record<StreamItem['kind'], number> = {
    post: 0, challenge: 0, video: 0, live: 0, miniapp: 0, status: 0, event: 0, ad: 0, performance: 0,
  };
  while (KINDS.some((k) => pools[k] > 0)) {
    const available = KINDS.filter((k) => pools[k] > 0);
    const totalWeight = available.reduce((sum, k) => sum + KIND_WEIGHTS[k], 0);
    for (const k of available) current[k] += KIND_WEIGHTS[k];
    let winner = available[0];
    for (const k of available) if (current[k] > current[winner]) winner = k;
    place(winner);
    current[winner] -= totalWeight;
  }

  return { items, exhausted: new Set(KINDS) };
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

// GET /stories/feed returns everything real-time (non-expired PUBLIC
// stories + friends' CONTACTS "Status" posts) grouped by author in one
// shot — same "re-pull and reveal unseen" shape as fetchMoreLive, since a
// 24h-TTL, friend-bounded pool has no meaningful cursor to page through.
export async function fetchMoreStatuses(seen: Set<string>): Promise<{ items: StatusItem[] }> {
  const res = await fetchApi('/stories/feed');
  if (!res.ok) return { items: [] };
  const groups: { userId: string; user: any; stories: any[] }[] = await res.json();
  const flat: StatusItem[] = [];
  for (const g of groups) {
    for (const s of g.stories) {
      if (seen.has(s.id)) continue;
      flat.push({
        id: s.id,
        author: {
          id: g.user?.id ?? g.userId,
          username: g.user?.username ?? '',
          displayName: g.user?.profile?.displayName,
          avatarUrl: g.user?.profile?.avatarUrl,
        },
        mediaUrl: s.mediaUrl,
        textContent: s.textContent,
        backgroundColor: s.backgroundColor,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        viewedByMe: s.viewedByMe,
      });
    }
  }
  flat.forEach((s) => seen.add(s.id));
  return { items: flat };
}

// GET /entertainment/events — real, bookable listings (ticketsAvailable > 0,
// startsAt in the future), same skip/take shape as challenges.
export async function fetchMoreEvents(skip: number, seen: Set<string>): Promise<{ items: EventCardData[]; nextSkip: number; hasMore: boolean }> {
  const res = await fetchApi(`/entertainment/events?take=${EVENTS_PAGE_SIZE}&skip=${skip}`);
  if (!res.ok) return { items: [], nextSkip: skip, hasMore: false };
  const data: EventCardData[] = await res.json();
  const fresh = data.filter((e) => !seen.has(e.id));
  fresh.forEach((e) => seen.add(e.id));
  return { items: fresh, nextSkip: skip + data.length, hasMore: data.length === EVENTS_PAGE_SIZE };
}

// GET /campaigns/feed — real sponsored/platform campaigns, audience-filtered
// server-side by the viewer's reputation level, cursor-paginated same as posts.
export async function fetchMoreAds(cursor: string | null, seen: Set<string>): Promise<{ items: CampaignDto[]; nextCursor: string | null }> {
  const qs = cursor ? `?take=${ADS_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}` : `?take=${ADS_PAGE_SIZE}`;
  const res = await fetchApi(`/campaigns/feed${qs}`);
  if (!res.ok) return { items: [], nextCursor: cursor };
  const data: { campaigns: CampaignDto[]; nextCursor: string | null } = await res.json();
  const fresh = data.campaigns.filter((c) => !seen.has(c.id));
  fresh.forEach((c) => seen.add(c.id));
  return { items: fresh, nextCursor: data.nextCursor };
}

// GET /performances/feed — published Sync posts, cursor-paginated same as posts.
export async function fetchMorePerformances(cursor: string | null, seen: Set<string>): Promise<{ items: PerformanceItem[]; nextCursor: string | null }> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const res = await fetchApi(`/performances/feed${qs}`);
  if (!res.ok) return { items: [], nextCursor: cursor };
  const data: { performances: PerformanceItem[]; nextCursor: string | null } = await res.json();
  const fresh = data.performances.filter((p) => !seen.has(p.id));
  fresh.forEach((p) => seen.add(p.id));
  return { items: fresh, nextCursor: data.nextCursor };
}
