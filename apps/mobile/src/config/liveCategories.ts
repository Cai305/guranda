import { GRADIENTS } from '../theme';

// ============================================================
// Guranda Live — category registry
// Live is a complete broadcasting platform, not a single feed.
// Every category ships today with its own real, working host tool
// (see hostSummary below) — see LiveCategoryHostPanel.tsx /
// LiveCategoryViewerPanel.tsx and components/live/liveCategoryRegistry.ts
// for how a category registers its own live panels.
// ============================================================

export type LiveCategoryStatus = 'live' | 'construction';

export interface LiveCategory {
  id: string;
  name: string;
  icon: string; // Ionicons name
  gradient: [string, string];
  tagline: string;
  description: string;
  features: string[];
  // One line naming the host tool that makes THIS category different from
  // the other 11 — always the real control rendered by that category's
  // Host component (LiveCategoryHostPanel.tsx / categories/rideLivePanel.tsx),
  // never an aspiration. This is what actually answers "why is this
  // category different" on the category detail page.
  hostSummary: string;
  status: LiveCategoryStatus;
}

export const LIVE_CATEGORIES: LiveCategory[] = [
  {
    id: 'social',
    name: 'Social Live',
    icon: 'people-circle',
    gradient: GRADIENTS.primary,
    tagline: 'Go live with your people',
    description: 'The TikTok Live of Guranda — go live, join friends, react in real time and build your following, all from your one identity.',
    features: ['Go Live', 'Join Live', 'Follow creators', 'Live comments', 'Emoji reactions', 'Invite guests', 'Multi-guest streaming', 'Moderators', 'Live replay', 'Picture-in-picture', 'Share stream'],
    hostSummary: 'Host tool: a live Q&A queue — viewer questions come in and you mark each one answered in real time.',
    status: 'live',
  },
  {
    id: 'conversation',
    name: 'Conversation Live',
    icon: 'chatbubbles',
    gradient: GRADIENTS.blue,
    tagline: 'Talk about anything',
    description: 'Pure conversation — banter, hot takes, politics, relationships, whatever the host wants to dig into. The topic is set by the host and can change any time, right there on screen.',
    features: ['Freely set the topic', 'Change the topic any time, live', 'Live comments', 'Emoji reactions', 'Gifting', 'Share stream'],
    hostSummary: "Host tool: a topic field pinned to the stream — change it any time and every viewer sees the update instantly.",
    status: 'live',
  },
  {
    id: 'shopping',
    name: 'Live Shopping',
    icon: 'pricetags',
    gradient: GRADIENTS.sunset,
    tagline: 'Sell and shop, live',
    description: 'Businesses and individuals sell products live — showcase, pin and sell without viewers ever leaving the stream.',
    features: ['Showcase products', 'Pin products during stream', 'Add products to cart', 'Purchase while watching', 'Live Q&A', 'Limited-time offers', 'Order notifications'],
    hostSummary: 'Host tool: build a real showcase from your own shop (Spotlight or Shelf) and advance it live — viewers buy without leaving the stream.',
    status: 'live',
  },
  {
    id: 'business',
    name: 'Business Live',
    icon: 'business',
    gradient: GRADIENTS.ocean,
    tagline: 'Announce it to the world',
    description: 'Built for companies and entrepreneurs — launches, announcements, recruitment and investor updates, streamed live.',
    features: ['Product launches', 'Company announcements', 'Recruitment events', 'Investor presentations', 'Customer support', 'Brand marketing'],
    hostSummary: 'Host tool: viewers tap Connect to open a real chat with you directly from the stream.',
    status: 'live',
  },
  {
    id: 'gaming',
    name: 'Gaming Live',
    icon: 'game-controller',
    gradient: GRADIENTS.aurora,
    tagline: 'Play, watch, compete',
    description: 'Gaming-focused streaming connected to every game inside Guranda — from casual matches to full tournament coverage.',
    features: ['Stream gameplay', 'Watch tournaments', 'Community chat', 'Leaderboards', 'Team broadcasts', 'Tournament coverage', 'Highlights'],
    hostSummary: 'Host tool: link a real match (Pool, Ludo, Chess, Murabaraba, Word Battle) or start a live chess game viewers watch move by move.',
    status: 'live',
  },
  {
    id: 'education',
    name: 'Education Live',
    icon: 'school',
    gradient: GRADIENTS.emerald,
    tagline: 'Learn from anywhere',
    description: 'For schools, universities, tutors and trainers — real classes, workshops and Q&A sessions, live.',
    features: ['Online classes', 'Workshops', 'Coding sessions', 'Tutorials', 'Language lessons', 'Q&A sessions'],
    hostSummary: 'Host tool: launch a live quiz with an optional real prize pool, then resolve it to pay winners.',
    status: 'live',
  },
  {
    id: 'entertainment',
    name: 'Entertainment Live',
    icon: 'musical-notes',
    gradient: GRADIENTS.crimson,
    tagline: 'Culture, live',
    description: 'Musicians, DJs, podcasts, comedy and performances — the stage moves to Guranda.',
    features: ['Musicians', 'DJs', 'Podcasts', 'Comedy', 'Performances', 'Live interviews', 'Talent shows'],
    hostSummary: 'Host tool: launch live polls the audience votes on in real time.',
    status: 'live',
  },
  {
    id: 'sports',
    name: 'Sports Live',
    icon: 'football',
    gradient: GRADIENTS.golden,
    tagline: 'Every match, covered',
    description: 'Match analysis, local sports and amateur leagues — commentary and training sessions from your community.',
    features: ['Match analysis', 'Local sports', 'Amateur leagues', 'Commentary', 'Training sessions', 'Press conferences'],
    hostSummary: 'Host tool: a live scoreboard plus a prediction pool viewers back — resolve it and the pool pays out.',
    status: 'live',
  },
  {
    id: 'food',
    name: 'Food Live',
    icon: 'restaurant',
    gradient: GRADIENTS.crimson,
    tagline: 'From the kitchen to you',
    description: 'Restaurants and chefs streaming cooking demonstrations, promotions and new menu launches.',
    features: ['Cooking demonstrations', 'Restaurant promotions', 'New menu launches', 'Live kitchen experiences'],
    hostSummary: 'Host tool: pin a real menu item from your store — viewers order it live.',
    status: 'live',
  },
  {
    id: 'ride',
    name: 'Ride Live',
    icon: 'car',
    gradient: GRADIENTS.midnight,
    tagline: 'The road, shared',
    description: 'Drivers go live and broadcast their real online/offline status straight from the Ride mini-app — viewers can see whether they\'re currently reachable for a ride and message them directly.',
    features: ['Broadcast online/offline status', 'Real driver rating & ride count', 'Active-ride indicator', 'Message the driver'],
    hostSummary: "Host tool: a real Go Online/Offline switch tied to your actual Ride driver status — viewers see whether you're reachable right now, not a simulation.",
    status: 'live',
  },
  {
    id: 'career',
    name: 'Career Live',
    icon: 'briefcase',
    gradient: GRADIENTS.ocean,
    tagline: 'Your next opportunity, live',
    description: 'Job fairs, interviews and networking events — build your career without leaving your digital life.',
    features: ['Job fairs', 'Interviews', 'Networking', 'Career advice', 'Company presentations'],
    hostSummary: 'Host tool: post a real job to the stream and review applicants as they come in.',
    status: 'live',
  },
  {
    id: 'dating',
    name: 'Dating Live',
    icon: 'heart-circle',
    gradient: GRADIENTS.sunset,
    tagline: 'Find your match, live',
    description: 'A host-run matchmaking show — viewers apply to be a contestant, the host features a pair at a time, the audience votes Match or Pass, and a declared match opens a real chat between them.',
    features: ['Apply to be a contestant', 'Host features a pair', 'Audience votes Match or Pass', 'Host declares a match', 'Instant chat on a match'],
    hostSummary: 'Host tool: review real applicants, feature a pair, and let the audience vote Match or Pass.',
    status: 'live',
  },
];

// Quick filter chips shown on the Discover Live feed. These cut
// across categories (e.g. "Trending", "Nearby") rather than
// mapping 1:1 to a category.
export const DISCOVER_TAGS = [
  'All', 'Following', 'Trending', 'Nearby', 'Gaming', 'Shopping',
  'Education', 'Business', 'Entertainment', 'Sports', 'Music',
  'Food', 'Technology', 'News',
];

export const getLiveCategory = (id: string): LiveCategory | undefined =>
  LIVE_CATEGORIES.find(c => c.id === id);

// Live categories still marked 'construction' open the shared Under
// Construction screen instead of the rich category detail page.
export function openLiveCategory(navigation: any, category: LiveCategory) {
  if (category.status === 'construction') {
    navigation.navigate('UnderConstruction', {
      name: category.name,
      icon: category.icon,
      tagline: category.tagline,
      description: category.description,
      features: category.features,
    });
  } else {
    navigation.navigate('LiveCategory', { categoryId: category.id });
  }
}
