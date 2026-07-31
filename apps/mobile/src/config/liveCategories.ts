import { GRADIENTS } from '../theme';

// ============================================================
// Guranda Live — category registry
// Live is a complete broadcasting platform, not a single feed.
// Each category has its own purpose, feature set and (mostly
// future) integration into the rest of the Guranda ecosystem.
// Only Ride Live is still "future use" end-to-end — every other
// category is browsable today with real UI and mock content.
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
  futureFeatures?: string[]; // explicitly future / monetization-adjacent items
  futureIntegration?: string; // module or system this will connect to later
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
    futureFeatures: ['Viewer gifts'],
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
    futureFeatures: ['Inventory integration', 'Marketplace checkout', 'Wallet payments', 'Delivery tracking'],
    futureIntegration: 'Marketplace, Wallet & Ride',
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
    futureIntegration: 'Marketplace',
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
    futureIntegration: 'Games',
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
    futureIntegration: 'Learning',
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
    futureIntegration: 'Entertainment',
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
    futureIntegration: 'Guranda Leagues',
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
    futureIntegration: 'Eat',
    status: 'live',
  },
  {
    id: 'ride',
    name: 'Ride Live',
    icon: 'car',
    gradient: GRADIENTS.midnight,
    tagline: 'The road, shared',
    description: 'Drivers will be able to broadcast road conditions, community updates and ride events — connected straight into Ride.',
    features: ['Road conditions', 'Community updates', 'Ride events'],
    futureIntegration: 'Ride',
    status: 'construction',
  },
  {
    id: 'career',
    name: 'Career Live',
    icon: 'briefcase',
    gradient: GRADIENTS.ocean,
    tagline: 'Your next opportunity, live',
    description: 'Job fairs, interviews and networking events — build your career without leaving your digital life.',
    features: ['Job fairs', 'Interviews', 'Networking', 'Career advice', 'Company presentations'],
    futureIntegration: 'Work',
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

// Live categories that are still fully "future use" (Ride Live)
// open the shared Under Construction screen instead of the rich
// category detail page.
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
