import { fetchApi } from '../utils/api';

// Registry of every mini app with owner-facing CRUD (create/edit/delete the
// user's own inventory), consumed by DashboardScreen to render one generic
// "manage" tile + analytics card per app the user has installed. `id` must
// match the install-state id used in config/modules.ts / StoreContext, and
// the `crud:<id>` feature-flag key admin uses to lock the entry point.

export interface MiniAppManageSummary {
  count: number;
  countLabel: string;
  // ISO date strings of the underlying items, used to bucket the small bar
  // chart by day. Empty array = tile renders without a chart (e.g. a
  // single-resource module like a restaurant profile with no per-item dates).
  dates: string[];
  raw: any;
}

export interface MiniAppManageEntry {
  id: string;
  label: string;
  icon: string; // Ionicons name
  iconColor: string;
  crudCapability: 'full' | 'membership-list';
  fetchSummary: () => Promise<MiniAppManageSummary>;
  resolveRoute: (summary: MiniAppManageSummary) => { name: string; params?: any };
}

async function getJson(path: string): Promise<any> {
  try {
    const res = await fetchApi(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const plural = (n: number, singular: string, pluralForm: string) => (n === 1 ? singular : pluralForm);

export const MINI_APP_MANAGE_REGISTRY: MiniAppManageEntry[] = [
  {
    id: 'property',
    label: 'Properties',
    icon: 'business',
    iconColor: '#FBBF24',
    crudCapability: 'full',
    fetchSummary: async () => {
      const arr = (await getJson('/property/mine')) ?? [];
      return { count: arr.length, countLabel: plural(arr.length, 'Unit', 'Units'), dates: arr.map((p: any) => p.createdAt), raw: arr };
    },
    resolveRoute: () => ({ name: 'MyProperties' }),
  },
  {
    id: 'work',
    label: 'Work',
    icon: 'briefcase',
    iconColor: '#38BDF8',
    crudCapability: 'full',
    fetchSummary: async () => {
      const company = await getJson('/work/companies/mine');
      const jobs = company?.jobs ?? [];
      return { count: jobs.length, countLabel: plural(jobs.length, 'Job posted', 'Jobs posted'), dates: jobs.map((j: any) => j.createdAt), raw: company };
    },
    resolveRoute: () => ({ name: 'MyCompany' }),
  },
  {
    id: 'eat',
    label: 'Restaurant',
    icon: 'restaurant',
    iconColor: '#FB923C',
    crudCapability: 'full',
    fetchSummary: async () => {
      const store = await getJson('/eat/my-store');
      const products = store?.products ?? [];
      return { count: products.length, countLabel: plural(products.length, 'Item', 'Items'), dates: [], raw: store };
    },
    resolveRoute: () => ({ name: 'MyStore' }),
  },
  {
    id: 'shopping',
    label: 'Shop',
    icon: 'bag-handle',
    iconColor: '#A78BFA',
    crudCapability: 'full',
    fetchSummary: async () => {
      const store = await getJson('/shopping/my-store');
      const products = store?.products ?? [];
      return { count: products.length, countLabel: plural(products.length, 'Item', 'Items'), dates: [], raw: store };
    },
    resolveRoute: () => ({ name: 'MyShoppingStore' }),
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'storefront',
    iconColor: '#A78BFA',
    crudCapability: 'full',
    fetchSummary: async () => {
      const arr = (await getJson('/marketplace/listings/mine')) ?? [];
      return { count: arr.length, countLabel: plural(arr.length, 'Listing', 'Listings'), dates: arr.map((l: any) => l.createdAt), raw: arr };
    },
    resolveRoute: () => ({ name: 'MyListings' }),
  },
  {
    id: 'carfind',
    label: 'CarFind',
    icon: 'car-sport',
    iconColor: '#60A5FA',
    crudCapability: 'full',
    fetchSummary: async () => {
      const arr = (await getJson('/carfind/listings/mine')) ?? [];
      return { count: arr.length, countLabel: plural(arr.length, 'Listing', 'Listings'), dates: arr.map((l: any) => l.createdAt), raw: arr };
    },
    // MyCarListings only lives inside the Life tab's stack (HubStackNavigator),
    // not RootNavigator (where Dashboard lives) — reach it via the same
    // nested-navigate shape used by config/modules.ts's own `route` fields.
    resolveRoute: () => ({ name: 'Main', params: { screen: 'Life', params: { screen: 'MyCarListings' } } }),
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: 'airplane',
    iconColor: '#818CF8',
    crudCapability: 'full',
    fetchSummary: async () => {
      const [stays, cars] = await Promise.all([getJson('/travel/stays/mine'), getJson('/travel/cars/mine')]);
      const staysArr = stays ?? [];
      const carsArr = cars ?? [];
      const all = [...staysArr, ...carsArr];
      return { count: all.length, countLabel: plural(all.length, 'Listing', 'Listings'), dates: all.map((l: any) => l.createdAt), raw: { stays: staysArr, cars: carsArr } };
    },
    resolveRoute: () => ({ name: 'MyTravelListings' }),
  },
  {
    id: 'entertainment',
    label: 'Events',
    icon: 'film',
    iconColor: '#FB923C',
    crudCapability: 'full',
    fetchSummary: async () => {
      const arr = (await getJson('/entertainment/events/mine')) ?? [];
      return { count: arr.length, countLabel: plural(arr.length, 'Event', 'Events'), dates: arr.map((e: any) => e.createdAt), raw: arr };
    },
    // MyEvents also only lives inside HubStackNavigator — same nested-navigate reasoning as CarFind above.
    resolveRoute: () => ({ name: 'Main', params: { screen: 'Life', params: { screen: 'MyEvents' } } }),
  },
  {
    id: 'finance',
    label: 'Stokvels',
    icon: 'trending-up',
    iconColor: '#F59E0B',
    // Stokvels are member-governed group wallets, not single-owner listings —
    // no delete here by design, just a membership list + create.
    crudCapability: 'membership-list',
    fetchSummary: async () => {
      const arr = (await getJson('/finance/stokvels/mine')) ?? [];
      return { count: arr.length, countLabel: plural(arr.length, 'Group', 'Groups'), dates: arr.map((s: any) => s.createdAt), raw: arr };
    },
    resolveRoute: () => ({ name: 'MyStokvels' }),
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'heart',
    iconColor: '#F472B6',
    crudCapability: 'full',
    fetchSummary: async () => {
      const [practitioner, pharmacy] = await Promise.all([getJson('/health/practitioners/mine'), getJson('/health/pharmacies/mine')]);
      const products = pharmacy?.products ?? [];
      const count = (practitioner ? 1 : 0) + (pharmacy ? 1 : 0) + products.length;
      return { count, countLabel: plural(count, 'Listing', 'Listings'), dates: [], raw: { practitioner, pharmacy } };
    },
    // Two distinct ownership tracks share one tile — route to whichever the
    // user actually has, defaulting to the practitioner profile (which itself
    // links onward to pharmacy setup) when they have neither yet.
    resolveRoute: (summary) => (summary.raw?.pharmacy && !summary.raw?.practitioner ? { name: 'MyPharmacy' } : { name: 'MyPractitioner' }),
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: 'school',
    iconColor: '#60A5FA',
    crudCapability: 'full',
    fetchSummary: async () => {
      const [courses, tutor] = await Promise.all([getJson('/learning/courses/mine'), getJson('/learning/tutors/mine')]);
      const coursesArr = courses ?? [];
      const count = coursesArr.length + (tutor ? 1 : 0);
      return { count, countLabel: plural(count, 'Listing', 'Listings'), dates: coursesArr.map((c: any) => c.createdAt), raw: { courses: coursesArr, tutor } };
    },
    resolveRoute: (summary) => (summary.raw?.courses?.length ? { name: 'MyCourses' } : { name: 'MyTutorProfile' }),
  },
  {
    id: 'username-market',
    label: 'Usernames',
    icon: 'at',
    iconColor: '#34D399',
    crudCapability: 'full',
    fetchSummary: async () => {
      const arr = (await getJson('/usernames/mine')) ?? [];
      return { count: arr.length, countLabel: plural(arr.length, 'Username', 'Usernames'), dates: arr.map((u: any) => u.createdAt), raw: arr };
    },
    resolveRoute: () => ({ name: 'MyUsernames' }),
  },
  {
    id: 'carwash',
    label: 'Carwash',
    icon: 'water',
    iconColor: '#38BDF8',
    crudCapability: 'full',
    fetchSummary: async () => {
      const arr = (await getJson('/carwash/mine')) ?? [];
      return { count: arr.length, countLabel: plural(arr.length, 'Carwash', 'Carwashes'), dates: arr.map((c: any) => c.createdAt), raw: arr };
    },
    resolveRoute: () => ({ name: 'MyCarWashes' }),
  },
];
