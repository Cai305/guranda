// Static knowledge about every built-in mini app/module in Guranda — what
// real-world problem each one solves and what it actually does. Two
// consumers:
//   1. AgentRuntimeService bakes this straight into the AI's system prompt,
//      so it already understands the product surface without a tool round
//      trip — this is product knowledge, not a permission-gated capability.
//   2. StoreService merges it with per-user install state for the live
//      miniapps.list tool result and the mobile Store screen.
// Mirrors apps/mobile/src/config/modules.ts (HubScreen's `miniAppIds`) —
// duplicated here, not derived at runtime, since that's a separate TS bundle
// the API can't import. Keep in sync if modules.ts changes.
export interface MiniAppCatalogEntry {
  id: string;
  name: string;
  tagline: string;
  /** The real-world problem this solves for the user. */
  solves: string;
  features: string[];
}

export const MINI_APPS_CATALOG: MiniAppCatalogEntry[] = [
  {
    id: 'work',
    name: 'Work',
    tagline: 'Earn inside your digital life',
    solves:
      'Finding income — a formal job or a freelance gig — without leaving the app, or hiring/managing freelancers if you run a business.',
    features: [
      'Browse job listings',
      'Freelance gig marketplace with proposals',
      'Employer company pages',
      'Escrow-protected freelance payments',
    ],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    tagline: 'Buy and sell anything',
    solves:
      'Buying or selling secondhand or new items locally, with fair price discovery, without a separate classifieds app.',
    features: [
      'Buy-now listings',
      'Auction-style bidding',
      'Seller listing management',
      'Buyer/seller messaging',
    ],
  },
  {
    id: 'ride',
    name: 'Ride',
    tagline: 'Move through the real world',
    solves:
      "Getting from A to B when you don't have a car or don't want to drive, without a separate ride-hailing app.",
    features: [
      'Request a ride with live driver matching',
      'Real-time trip tracking',
      'In-app fare payment from wallet',
    ],
  },
  {
    id: 'eat',
    name: 'Eat',
    tagline: 'Food, delivered to your life',
    solves: "Getting food delivered when you don't want to cook or go out.",
    features: [
      'Browse local restaurants/stores',
      'Order food for delivery',
      'Track delivery status',
      'Pay from wallet',
    ],
  },
  {
    id: 'property',
    name: 'Property',
    tagline: 'Find your place',
    solves:
      'Finding a place to rent (or listing a property you own to rent out), without a separate real-estate app.',
    features: [
      'Browse rental listings',
      'Apply and sign a lease',
      'List your own property',
      'Manage tenants',
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    tagline: 'One connected economy',
    solves:
      'Running a stokvel or group savings pot with real transparency and trust, instead of a WhatsApp group and a spreadsheet.',
    features: [
      'Create or join a stokvel',
      'Contribute funds',
      'Request and vote on payouts',
      'XRPL multisig wallet for transparent, tamper-proof funds',
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    tagline: 'Retail, reimagined',
    solves:
      'Online retail shopping — browsing and buying products — inside the same app you already use daily.',
    features: [
      'Product-grid browsing',
      'Cart and checkout',
      'Seller storefronts',
      'Order tracking',
    ],
  },
  {
    id: 'learning',
    name: 'Learning',
    tagline: 'Level up in real life',
    solves:
      'Upskilling or learning something new without juggling separate ed-tech apps for courses, tutors and study groups.',
    features: [
      'Enroll in courses with progress tracking',
      'Earn certificates',
      'Book 1:1 tutor sessions',
      'Join study communities',
    ],
  },
  {
    id: 'health',
    name: 'Health',
    tagline: 'Your wellbeing, connected',
    solves:
      'Managing fitness, healthcare appointments and medicine in one place instead of several separate health apps.',
    features: [
      'Log fitness activity',
      'Book practitioner appointments',
      'Order from a pharmacy',
      'Wellness content feed',
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    tagline: 'The world, one tap away',
    solves:
      'Planning an entire trip — flights, a place to stay, ground transport — in one place instead of four different travel sites.',
    features: [
      'Search and book flights',
      'Search and book hotel stays',
      'Search and book rental cars',
      'Browse curated holiday packages',
      'View "My Trips"',
    ],
  },
  {
    id: 'hair',
    name: 'Hair',
    tagline: 'Hair & Beauty',
    solves:
      'Booking a hairdresser or beauty appointment without calling around or using a separate booking app.',
    features: [
      'Browse hairdressers',
      'View services and pricing',
      'Book appointment slots',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    tagline: 'Culture on demand',
    solves:
      'Finding and booking things to do — movies, concerts, live events — instead of checking multiple ticketing sites.',
    features: [
      'Browse movies, concerts and events',
      'Book tickets',
      'Manage bookings',
    ],
  },
  {
    id: 'carfind',
    name: 'CarFind',
    tagline: 'Find your next car',
    solves:
      'Buying or selling a car — browsing real listings with proper filters, or reaching serious buyers — without a separate car classifieds site.',
    features: [
      'Search cars by make, model, price, mileage, body type, fuel type and transmission',
      'Detailed listing pages with photos and specs',
      'List your own car for sale',
      'Send and receive buyer enquiries',
    ],
  },
];
