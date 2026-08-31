import { GRADIENTS } from '../theme';
import { AI_ENABLED } from './featureFlags';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { useAuth } from '../context/AuthContext';

// ============================================================
// Guranda Module Registry
// Every service in the Guranda ecosystem is a module. New
// modules plug in here without touching existing screens —
// flip `status` to 'live' and point `route` at the screen.
// ============================================================

export type ModuleStatus = 'live' | 'construction' | 'installable' | 'locked';

export interface LifeModule {
  id: string;
  name: string;
  icon: string; // Ionicons name
  gradient: [string, string];
  status: ModuleStatus;
  tagline: string;
  description: string;
  features: string[];
  // Navigation target for live modules (root-level navigate call)
  route?: { name: string; params?: any };
}

export const MODULES: LifeModule[] = [
  {
    id: 'ai',
    name: 'AI Companion',
    icon: 'sparkles',
    gradient: GRADIENTS.primary,
    status: AI_ENABLED ? 'live' : 'construction',
    tagline: 'Your life, assisted',
    description: 'Your personal AI companion — chat, wake-ups computed around your schedule, ride requests, wallet checks and a guide to everything in Guranda. Every action needs your approval.',
    features: ['Companion chat', 'Smart wake-ups', 'Ride requests', 'Wallet insights', 'Guided tours', 'Approval-first actions'],
    route: { name: 'AiChat' },
  },
  {
    id: 'discovery',
    name: 'Discovery',
    icon: 'play-circle',
    gradient: GRADIENTS.crimson,
    status: 'live',
    tagline: 'Videos tailored to you',
    description: 'A YouTube-style video feed personalised to your interests. Upload videos, build playlists, save for later, comment, like and share.',
    features: ['Personalised feed', 'Trending videos', 'Upload & share', 'Playlists', 'Watch Later', 'Comments & likes', 'Interest-based recommendations'],
    route: { name: 'Discovery' },
  },
  {
    id: 'live',
    name: 'Live',
    icon: 'radio',
    gradient: GRADIENTS.live,
    status: 'live',
    tagline: 'Broadcast to the world',
    description: 'A complete live broadcasting platform — social live, live shopping, business events, gaming streams, education, entertainment, sports, food and more, all in one place.',
    features: ['Social Live', 'Live Shopping', 'Business Live', 'Gaming Live', 'Education Live', 'Entertainment Live', 'Sports Live', 'Food Live', 'Career Live'],
    route: { name: 'LiveCategories' },
  },
  {
    id: 'social',
    name: 'Social',
    icon: 'chatbubbles',
    gradient: GRADIENTS.primary,
    status: 'live',
    tagline: 'Your people, one tap away',
    description: 'Messaging, voice, video, groups, communities, status updates, friends and events — your entire social life in one place.',
    features: ['Messaging', 'Voice & Video', 'Groups', 'Communities', 'Status updates', 'Friends', 'Events'],
    route: { name: 'Main', params: { screen: 'Chat' } },
  },
  {
    id: 'games',
    name: 'Games',
    icon: 'game-controller',
    gradient: GRADIENTS.aurora,
    status: 'live',
    tagline: 'Play, compete, earn',
    description: 'The Guranda Arcade — multiplayer games, tournaments, seasons, leaderboards and rewards, all connected to your one identity.',
    features: ['Multiplayer Chess', 'Trivia Arcade', 'Tournaments', 'Leaderboards', 'Seasons & Rewards'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Games' } } },
  },
  {
    id: 'poster',
    name: 'Poster & Editor',
    icon: 'color-wand',
    gradient: GRADIENTS.sunset,
    status: 'live',
    tagline: 'Design, edit, share',
    description: 'Create posters from templates and edit your photos with filters, text, and stickers — the same tool that powers editing across Stories, Posts and your profile photo.',
    features: ['Poster templates', 'Filters & adjustments', 'Crop & rotate', 'Text & stickers', 'Save, share or post'],
    route: { name: 'PosterCreator' },
  },
  {
    id: 'work',
    name: 'Work',
    icon: 'briefcase',
    gradient: GRADIENTS.ocean,
    status: 'installable',
    tagline: 'Earn inside your digital life',
    description: 'Find jobs, freelance for clients, build businesses and hire talent — all powered by your Guranda identity and reputation.',
    features: ['Jobs', 'Freelancing', 'Businesses', 'Hiring'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'WorkHome' } } },
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    icon: 'storefront',
    gradient: GRADIENTS.sunset,
    status: 'installable',
    tagline: 'Buy and sell anything',
    description: 'A trusted marketplace connected to your wallet and reputation. Buy, sell and auction locally or across the ecosystem.',
    features: ['Buy', 'Sell', 'Auctions', 'Local marketplace'],
    route: { name: 'MarketplaceHome' },
  },
  {
    id: 'username-market',
    name: 'Username Market',
    icon: 'at',
    gradient: GRADIENTS.emerald,
    status: 'installable',
    tagline: 'Own your handle',
    description: 'Claim, mint, buy, sell and auction usernames. Reputation transfers with an established handle — the more it carries, the more it\'s worth.',
    features: ['Mint usernames', 'Sell', 'Auctions', 'Reputation transfers'],
    route: { name: 'UsernameMarketHome' },
  },
  {
    id: 'ride',
    name: 'Ride',
    icon: 'car-sport',
    gradient: GRADIENTS.midnight,
    status: 'installable',
    tagline: 'Move through the real world',
    description: 'Book rides, drive and earn, track trips live and save your favourite places — paid seamlessly from your Guranda wallet.',
    features: ['Book rides', 'Driver mode', 'Live tracking', 'Ride history', 'Saved places'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Ride' } } },
  },
  {
    id: 'eat',
    name: 'Eat',
    icon: 'restaurant',
    gradient: GRADIENTS.crimson,
    status: 'installable',
    tagline: 'Food, delivered to your life',
    description: 'Order from restaurants, get groceries delivered or pick up on the go — with live tracking from kitchen to door.',
    features: ['Restaurants', 'Delivery', 'Pickup', 'Grocery', 'Live tracking'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'EatHome' } } },
  },
  {
    id: 'property',
    name: 'Property',
    icon: 'home',
    gradient: GRADIENTS.emerald,
    status: 'installable',
    tagline: 'Find your place',
    description: 'Buy, rent and invest in property. Browse homes and commercial spaces, and connect with estate agents you can trust — any user can become an agent, manage tenants, track rent, and issue receipts and leases.',
    features: ['Buy & rent', 'Commercial spaces', 'Agent dashboard', 'Rent tracking', 'Auto receipts', 'Lease generation', 'Issue reporting'],
    route: { name: 'PropertyHome' },
  },
  {
    id: 'voting',
    name: 'Ballot',
    icon: 'checkmark-done-circle',
    gradient: GRADIENTS.aurora,
    status: 'live',
    tagline: 'Elections for any structure',
    description: 'Real elections for any structure — HOAs, company boards, unions, student bodies. Single-choice, ranked-choice, multi-select and weighted ballots, biometric check-in, and every vote recorded as a verifiable XRPL transaction.',
    features: ['Any structure', 'Single/ranked/multi/weighted ballots', 'Biometric check-in', 'XRPL vote receipts', 'Live results'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'VotingHome' } } },
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'trending-up',
    gradient: GRADIENTS.golden,
    status: 'installable',
    tagline: 'One connected economy',
    description: 'Stokvels with real XRPL multisig wallets — group savings, business funding, and more, governed by the members who own them.',
    features: ['Stokvels', 'Multisig wallets', 'Member voting', 'Committee sign-off', 'Real XRPL payments'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'FinanceHome' } } },
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'bag-handle',
    gradient: GRADIENTS.primary,
    status: 'installable',
    tagline: 'Retail, reimagined',
    description: 'Shop your favourite brands and stores inside Guranda, with one checkout, one wallet and rewards on everything.',
    features: ['Brand stores', 'One-tap checkout', 'Order tracking', 'Rewards on purchases'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'ShoppingHome' } } },
  },
  {
    id: 'learning',
    name: 'Learning',
    icon: 'school',
    gradient: GRADIENTS.ocean,
    status: 'installable',
    tagline: 'Level up in real life',
    description: 'Courses, skills and certifications that plug straight into your digital identity — learn, get certified, get hired.',
    features: ['Courses', 'Skills & certifications', 'Tutors', 'Study communities'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'LearningHome' } } },
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'heart',
    gradient: GRADIENTS.crimson,
    status: 'installable',
    tagline: 'Your wellbeing, connected',
    description: 'Fitness, wellness and healthcare — track your health, book appointments and stay covered, all in one place.',
    features: ['Fitness tracking', 'Doctor bookings', 'Pharmacy', 'Wellness'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'HealthHome' } } },
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: 'airplane',
    gradient: GRADIENTS.aurora,
    status: 'installable',
    tagline: 'The world, one tap away',
    description: 'Plan and book entire trips — flights, hotels, holidays and car hire — with your Guranda identity and wallet.',
    features: ['Flights', 'Hotels', 'Holidays', 'Car hire'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'TravelHome' } } },
  },
  {
    id: 'hair',
    name: 'Hair',
    icon: 'cut',
    gradient: GRADIENTS.primary,
    status: 'installable',
    tagline: 'Hair & Beauty',
    description: 'Find hairdressers, book appointments, and buy hair products.',
    features: ['Book hairdressers', 'Buy hair products', 'Beauty services'],
    route: { name: 'HairHome' },
  },
  {
    id: 'events',
    name: 'Events',
    icon: 'ticket',
    gradient: ['#10B981', '#22D3EE'] as [string, string],
    status: 'live',
    tagline: 'Book live events near you',
    description: 'Discover concerts, festivals, comedy shows, sports and more. Buy tickets with your Guranda wallet, manage your own events, and check in guests on the door.',
    features: ['Browse & filter events', 'Book tickets with MSH', 'Create & manage events', 'Invite team members', 'QR ticket check-in'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'EventsHome' } } },
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film',
    gradient: GRADIENTS.sunset,
    status: 'installable',
    tagline: 'Culture on demand',
    description: 'Movies, music, live events and streaming — discover, book and watch without ever leaving your digital life.',
    features: ['Movies', 'Music', 'Live events', 'Streaming'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'EntertainmentHome' } } },
  },
  {
    id: 'carfind',
    name: 'CarFind',
    icon: 'car-sport',
    gradient: GRADIENTS.wallet,
    status: 'installable',
    tagline: 'Find your next car',
    description: 'Browse real car listings by make, model, price, mileage and more — or list your own car for sale and hear from real buyers.',
    features: ['Search & filter listings', 'Detailed specs & photos', 'List your car for sale', 'Buyer enquiries'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'CarFindHome' } } },
  },
  {
    id: 'carwash',
    name: 'Carwash',
    icon: 'water',
    gradient: GRADIENTS.blue,
    status: 'installable',
    tagline: 'Book a wash instantly',
    description: 'Find local carwashes, view their prices and services, and book a wash instantly. Carwash owners can also list their services.',
    features: ['Book a wash', 'Find local carwashes', 'List a carwash', 'Manage services'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'CarWashHome' } } },
  },
  {
    id: 'miniapps',
    name: 'Mini Apps',
    icon: 'apps',
    gradient: GRADIENTS.emerald,
    status: 'live',
    tagline: 'An ecosystem of apps',
    description: 'Install mini apps and games built by the Guranda developer community.',
    features: ['App store', 'Mini games', 'Developer publishing'],
    route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Hub' } } },
  },
];

export const getModule = (id: string): LifeModule | undefined =>
  MODULES.find(m => m.id === id);

// The curated set of modules that count as "mini apps" for the Store, the
// Home screen's "Explore Mini Apps" preview strip, and any other mini-app
// surface — deliberately excludes core sections (AI, Discovery, Live,
// Social, Games, Mini Apps itself) that already have their own top-level
// tile elsewhere. Includes both 'installable' apps and the handful that
// are 'live' (Poster & Editor, Events) but are still browsed/opened the
// same way a mini app is.
export const MINI_APP_IDS = [
  'poster', 'voting', 'events', 'health', 'travel', 'learning', 'shopping', 'property',
  'finance', 'work', 'marketplace', 'username-market', 'ride', 'eat', 'hair',
  'entertainment', 'carfind', 'carwash',
];

// Applies the admin dashboard's per-module feature flags on top of the
// static registry: OFF hides a module behind Under Construction, and
// VERIFIED_ONLY locks it (for otherwise-live modules) until the current
// user is verified.
export function useEffectiveModules(): LifeModule[] {
  const { effectiveAccess } = useFeatureFlags();
  const { isVerified } = useAuth();
  return MODULES.map(m => {
    const access = effectiveAccess(m.id, isVerified);
    if (access === 'off') return { ...m, status: 'construction' as ModuleStatus };
    if (access === 'locked' && m.status === 'live') return { ...m, status: 'locked' as ModuleStatus };
    return m;
  });
}

// Single entry point for opening any module. Live modules go to
// their screen; locked modules prompt verification; unfinished
// modules open the Under Construction experience — never a dead
// tap, never a blank page.
export function openModule(navigation: any, module: LifeModule) {
  if (module.status === 'live' && module.route) {
    navigation.navigate(module.route.name, module.route.params);
  } else if (module.status === 'locked') {
    navigation.navigate('VerifyAccount', { reason: `${module.name} requires a verified Guranda account` });
  } else if (module.status === 'installable') {
    // Installable modules can only be installed from the Mini Apps store,
    // which owns the install prompt/AsyncStorage state — send callers there
    // instead of a misleading Under Construction dead-end.
    const miniApps = getModule('miniapps');
    if (miniApps?.route) navigation.navigate(miniApps.route.name, miniApps.route.params);
    else navigation.navigate('UnderConstruction', { moduleId: module.id });
  } else {
    navigation.navigate('UnderConstruction', { moduleId: module.id });
  }
}
