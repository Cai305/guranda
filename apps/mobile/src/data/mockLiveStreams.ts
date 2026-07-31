import { getLiveCategory } from '../config/liveCategories';

// ============================================================
// Mock Live data. There is no real streaming/ingest backend yet
// (see Streaming Features in the module UI) — this data powers
// a fully interactive UI so the Live module feels real while the
// broadcasting infrastructure is still 🚧.
// ============================================================

export interface LiveCreator {
  id: string;
  name: string;
  avatarSeed: string;
  verified: boolean;
  followers: number;
  following: number;
  totalViews: number;
  totalLikes: number;
  watchTimeHours: number;
  badges: string[];
  categoryIds: string[];
}

export interface LiveStream {
  id: string;
  title: string;
  categoryId: string;
  tags: string[];
  viewers: number;
  creator: LiveCreator;
  pinnedProduct?: { name: string; price: string };
}

export interface ScheduledStream {
  id: string;
  title: string;
  when: string;
  categoryId: string;
}

export interface ReplayStream {
  id: string;
  title: string;
  when: string;
  views: number;
  categoryId: string;
}

const creator = (data: Omit<LiveCreator, 'id'> & { id: string }): LiveCreator => data;

export const MOCK_CREATORS: Record<string, LiveCreator> = {
  lindiwe: creator({
    id: 'lindiwe', name: 'Lindiwe M', avatarSeed: 'lindiwe-live', verified: false,
    followers: 4200, following: 180, totalViews: 82000, totalLikes: 15300, watchTimeHours: 640,
    badges: ['🎥 Streamer', '🔥 Rising'], categoryIds: ['social'],
  }),
  urbankicks: creator({
    id: 'urbankicks', name: 'UrbanKicks ZA', avatarSeed: 'urbankicks', verified: true,
    followers: 38500, following: 40, totalViews: 1200000, totalLikes: 210000, watchTimeHours: 9800,
    badges: ['🛍️ Top Seller', '✅ Verified'], categoryIds: ['shopping'],
  }),
  lifeosTeam: creator({
    id: 'lifeosTeam', name: 'Guranda Team', avatarSeed: 'lifeos-official', verified: true,
    followers: 210000, following: 3, totalViews: 5400000, totalLikes: 980000, watchTimeHours: 42000,
    badges: ['✅ Verified', '🏢 Official'], categoryIds: ['business', 'career'],
  }),
  skyz: creator({
    id: 'skyz', name: 'SkyzGaming', avatarSeed: 'skyz-gaming', verified: true,
    followers: 76000, following: 220, totalViews: 3100000, totalLikes: 540000, watchTimeHours: 18000,
    badges: ['🎮 Pro Gamer', '✅ Verified'], categoryIds: ['gaming'],
  }),
  thandi: creator({
    id: 'thandi', name: 'CodeWithThandi', avatarSeed: 'thandi-code', verified: true,
    followers: 15400, following: 95, totalViews: 640000, totalLikes: 88000, watchTimeHours: 5200,
    badges: ['🎓 Educator', '✅ Verified'], categoryIds: ['education'],
  }),
  naledi: creator({
    id: 'naledi', name: 'Naledi Music', avatarSeed: 'naledi-music', verified: false,
    followers: 9800, following: 310, totalViews: 210000, totalLikes: 41000, watchTimeHours: 3100,
    badges: ['🎵 Musician'], categoryIds: ['entertainment'],
  }),
  townshipfc: creator({
    id: 'townshipfc', name: 'Township FC', avatarSeed: 'township-fc', verified: false,
    followers: 6200, following: 12, totalViews: 98000, totalLikes: 14000, watchTimeHours: 2100,
    badges: ['⚽ Sports'], categoryIds: ['sports'],
  }),
  chefkagiso: creator({
    id: 'chefkagiso', name: 'Chef Kagiso', avatarSeed: 'chef-kagiso', verified: true,
    followers: 22000, following: 60, totalViews: 780000, totalLikes: 145000, watchTimeHours: 6400,
    badges: ['🍳 Chef', '✅ Verified'], categoryIds: ['food'],
  }),
  unilife: creator({
    id: 'unilife', name: 'UniLife Study Group', avatarSeed: 'unilife', verified: false,
    followers: 3100, following: 40, totalViews: 54000, totalLikes: 7200, watchTimeHours: 1400,
    badges: ['🎓 Educator'], categoryIds: ['education'],
  }),
  laughtrack: creator({
    id: 'laughtrack', name: 'LaughTrack Comedy', avatarSeed: 'laughtrack', verified: false,
    followers: 8700, following: 150, totalViews: 320000, totalLikes: 61000, watchTimeHours: 2800,
    badges: ['🎤 Comedian'], categoryIds: ['entertainment'],
  }),
  threadsbyzanele: creator({
    id: 'threadsbyzanele', name: 'Threads by Zanele', avatarSeed: 'zanele-threads', verified: true,
    followers: 12900, following: 210, totalViews: 410000, totalLikes: 76000, watchTimeHours: 3900,
    badges: ['🛍️ Top Seller', '✅ Verified'], categoryIds: ['shopping'],
  }),
  cityleague: creator({
    id: 'cityleague', name: 'City League', avatarSeed: 'city-league', verified: true,
    followers: 19500, following: 8, totalViews: 560000, totalLikes: 89000, watchTimeHours: 4700,
    badges: ['⚽ Sports', '✅ Verified'], categoryIds: ['sports'],
  }),
};

export const MOCK_STREAMS: LiveStream[] = [
  { id: 's1', title: 'Friday Night Hangout', categoryId: 'social', tags: ['Trending', 'Following'], viewers: 1240, creator: MOCK_CREATORS.lindiwe },
  { id: 's2', title: 'New Sneaker Drop 🔥', categoryId: 'shopping', tags: ['Shopping', 'Trending'], viewers: 3820, creator: MOCK_CREATORS.urbankicks, pinnedProduct: { name: 'Retro Runner 92', price: '450.00' } },
  { id: 's3', title: 'Guranda Product Launch', categoryId: 'business', tags: ['Business', 'Trending', 'Technology'], viewers: 9600, creator: MOCK_CREATORS.lifeosTeam },
  { id: 's4', title: 'Ranked Grind to Diamond', categoryId: 'gaming', tags: ['Gaming', 'Trending'], viewers: 5100, creator: MOCK_CREATORS.skyz },
  { id: 's5', title: 'Learn React Native Live', categoryId: 'education', tags: ['Education', 'Technology'], viewers: 640, creator: MOCK_CREATORS.thandi },
  { id: 's6', title: 'Acoustic Sessions', categoryId: 'entertainment', tags: ['Music', 'Entertainment'], viewers: 980, creator: MOCK_CREATORS.naledi },
  { id: 's7', title: 'Local Derby Analysis', categoryId: 'sports', tags: ['Sports', 'Nearby'], viewers: 410, creator: MOCK_CREATORS.townshipfc },
  { id: 's8', title: 'Sunday Braai Masterclass', categoryId: 'food', tags: ['Food', 'Trending'], viewers: 2260, creator: MOCK_CREATORS.chefkagiso, pinnedProduct: { name: 'Kagiso Spice Rub', price: '85.00' } },
  { id: 's9', title: 'Tech Career Fair 2026', categoryId: 'career', tags: ['Business', 'Technology'], viewers: 1870, creator: MOCK_CREATORS.lifeosTeam },
  { id: 's10', title: 'Study With Me: Finals Week', categoryId: 'education', tags: ['Education', 'Nearby'], viewers: 305, creator: MOCK_CREATORS.unilife },
  { id: 's11', title: 'Comedy Open Mic', categoryId: 'entertainment', tags: ['Entertainment'], viewers: 720, creator: MOCK_CREATORS.laughtrack },
  { id: 's12', title: 'Boutique Fashion Live Sale', categoryId: 'shopping', tags: ['Shopping', 'Following'], viewers: 1560, creator: MOCK_CREATORS.threadsbyzanele, pinnedProduct: { name: 'Zanele Wrap Dress', price: '620.00' } },
  { id: 's13', title: '5-a-Side Tournament Finals', categoryId: 'sports', tags: ['Sports', 'Trending'], viewers: 4300, creator: MOCK_CREATORS.cityleague },
];

export const MOCK_SCHEDULE: ScheduledStream[] = [
  { id: 'sc1', title: 'Season 1 Grand Final', when: 'Tomorrow · 18:00', categoryId: 'gaming' },
  { id: 'sc2', title: 'New Collection Drop', when: 'Saturday · 12:00', categoryId: 'shopping' },
  { id: 'sc3', title: 'Guranda Town Hall', when: 'Monday · 09:00', categoryId: 'business' },
];

export const MOCK_REPLAYS: ReplayStream[] = [
  { id: 'r1', title: 'Chess Speedrun Highlights', when: '3 days ago', views: 12400, categoryId: 'gaming' },
  { id: 'r2', title: 'Winter Collection Launch', when: '1 week ago', views: 34800, categoryId: 'shopping' },
  { id: 'r3', title: 'Q&A with the Founders', when: '2 weeks ago', views: 61200, categoryId: 'business' },
];

export function streamsForTag(tag: string): LiveStream[] {
  if (tag === 'All') return MOCK_STREAMS;
  return MOCK_STREAMS.filter(s => s.tags.includes(tag));
}

export function streamsForCategory(categoryId: string): LiveStream[] {
  return MOCK_STREAMS.filter(s => s.categoryId === categoryId);
}

export function categoryOf(stream: LiveStream) {
  return getLiveCategory(stream.categoryId);
}
