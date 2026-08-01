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
  // Total MSH earned by this module's owner, computed from real backend
  // data (sold listings, paid orders, rent payments, etc). Left undefined
  // for modules without clean dated-revenue data to draw from.
  revenue?: number;
  // ISO date strings, one per earning event, parallel-array style to
  // `dates` — used to bucket a small "earnings over time" chart the same
  // way `dates` buckets item counts. Left undefined when `revenue` is
  // undefined, or when a revenue total exists but no per-event dates do.
  revenueDates?: string[];
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
      // myProperties() nests `payments` per active tenancy per property —
      // flatten every rent payment across every unit into one revenue feed.
      const payments = arr.flatMap((p: any) => (p.tenancies ?? []).flatMap((t: any) => t.payments ?? []));
      const revenue = payments.length ? payments.reduce((sum: number, pay: any) => sum + Number(pay.amount), 0) : undefined;
      const revenueDates = payments.length ? payments.map((pay: any) => pay.paidAt).filter(Boolean) : undefined;
      return { count: arr.length, countLabel: plural(arr.length, 'Unit', 'Units'), dates: arr.map((p: any) => p.createdAt), raw: arr, revenue, revenueDates };
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
      const [company, freelanceWork] = await Promise.all([
        getJson('/work/companies/mine'),
        getJson('/work/gigs/freelancing/mine'),
      ]);
      const jobs = company?.jobs ?? [];
      // Freelance earnings only land in the freelancer's wallet once the
      // client approves the work (gig.status === 'COMPLETED'); escrowAmount
      // is the paid amount for those.
      const completedGigs = (freelanceWork ?? []).filter((g: any) => g.status === 'COMPLETED');
      const revenue = completedGigs.length
        ? completedGigs.reduce((sum: number, g: any) => sum + Number(g.escrowAmount), 0)
        : undefined;
      // WorkGig has no completedAt field — updatedAt is the closest proxy
      // for "when it was marked complete" since status transitions bump it.
      const revenueDates = completedGigs.length ? completedGigs.map((g: any) => g.updatedAt).filter(Boolean) : undefined;
      return {
        count: jobs.length,
        countLabel: plural(jobs.length, 'Job posted', 'Jobs posted'),
        dates: jobs.map((j: any) => j.createdAt),
        raw: { company, freelanceWork },
        revenue,
        revenueDates,
      };
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
      const [store, orders] = await Promise.all([getJson('/eat/my-store'), getJson('/eat/my-store/orders')]);
      const products = store?.products ?? [];
      // Wallet debit happens at placeOrder time, so every non-cancelled
      // order already represents money paid for this store.
      const paidOrders = (orders ?? []).filter((o: any) => o.status !== 'CANCELLED');
      const revenue = paidOrders.length ? paidOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0) : undefined;
      const revenueDates = paidOrders.length ? paidOrders.map((o: any) => o.createdAt).filter(Boolean) : undefined;
      return {
        count: products.length,
        countLabel: plural(products.length, 'Item', 'Items'),
        dates: [],
        raw: { store, orders },
        revenue,
        revenueDates,
      };
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
      const [store, orders] = await Promise.all([getJson('/shopping/my-store'), getJson('/shopping/my-store/orders')]);
      const products = store?.products ?? [];
      // Same as Eat — wallet debit happens at placeOrder time, so every
      // non-cancelled order already represents money paid for this store.
      const paidOrders = (orders ?? []).filter((o: any) => o.status !== 'CANCELLED');
      const revenue = paidOrders.length ? paidOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0) : undefined;
      const revenueDates = paidOrders.length ? paidOrders.map((o: any) => o.createdAt).filter(Boolean) : undefined;
      return {
        count: products.length,
        countLabel: plural(products.length, 'Item', 'Items'),
        dates: [],
        raw: { store, orders },
        revenue,
        revenueDates,
      };
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
      const sold = arr.filter((l: any) => l.status === 'SOLD');
      // Auctions settle without ever rewriting `price` to the winning bid —
      // the actual sale amount lives in `currentBid` for those.
      const revenue = sold.length
        ? sold.reduce((sum: number, l: any) => sum + Number(l.listingType === 'AUCTION' ? (l.currentBid ?? l.price) : l.price), 0)
        : undefined;
      const revenueDates = sold.length ? sold.map((l: any) => l.soldAt).filter(Boolean) : undefined;
      return {
        count: arr.length,
        countLabel: plural(arr.length, 'Listing', 'Listings'),
        dates: arr.map((l: any) => l.createdAt),
        raw: arr,
        revenue,
        revenueDates,
      };
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
      // getMyStays/getMyCars both nest `bookings` per listing already.
      const bookings = all.flatMap((l: any) => l.bookings ?? []);
      const revenue = bookings.length ? bookings.reduce((sum: number, b: any) => sum + Number(b.totalPrice), 0) : undefined;
      const revenueDates = bookings.length ? bookings.map((b: any) => b.createdAt).filter(Boolean) : undefined;
      return {
        count: all.length,
        countLabel: plural(all.length, 'Listing', 'Listings'),
        dates: all.map((l: any) => l.createdAt),
        raw: { stays: staysArr, cars: carsArr },
        revenue,
        revenueDates,
      };
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
      const [practitioner, pharmacy, pharmacyOrders] = await Promise.all([
        getJson('/health/practitioners/mine'),
        getJson('/health/pharmacies/mine'),
        getJson('/health/pharmacies/mine/orders'),
      ]);
      const products = pharmacy?.products ?? [];
      const count = (practitioner ? 1 : 0) + (pharmacy ? 1 : 0) + products.length;
      // getMyPractitioner() already nests `appointments` (with `fee`) — no
      // extra per-practitioner-id call needed. The patient's wallet is
      // debited at booking time regardless of eventual status, so only
      // CANCELLED appointments are excluded from revenue.
      const appointments = (practitioner?.appointments ?? []).filter((a: any) => a.status !== 'CANCELLED');
      const paidPharmacyOrders = (pharmacyOrders ?? []).filter((o: any) => o.status !== 'CANCELLED');
      const revenueEvents = [
        ...appointments.map((a: any) => ({ amount: Number(a.fee), date: a.scheduledAt || a.createdAt })),
        ...paidPharmacyOrders.map((o: any) => ({ amount: Number(o.total), date: o.createdAt })),
      ];
      const revenue = revenueEvents.length ? revenueEvents.reduce((sum, e) => sum + e.amount, 0) : undefined;
      const revenueDates = revenueEvents.length ? revenueEvents.map((e) => e.date).filter(Boolean) : undefined;
      return {
        count,
        countLabel: plural(count, 'Listing', 'Listings'),
        dates: [],
        raw: { practitioner, pharmacy, pharmacyOrders },
        revenue,
        revenueDates,
      };
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
      // courses/mine (myCreatedCourses) only returns `_count.enrollments`,
      // not per-enrollment records — so a total can be computed but there's
      // no per-earning-event date to bucket a chart with. No fabricated
      // dates: revenueDates stays undefined here by design.
      const paidCourses = coursesArr.filter((c: any) => Number(c.price) > 0 && (c._count?.enrollments ?? 0) > 0);
      const revenue = paidCourses.length
        ? paidCourses.reduce((sum: number, c: any) => sum + Number(c.price) * (c._count?.enrollments ?? 0), 0)
        : undefined;
      return {
        count,
        countLabel: plural(count, 'Listing', 'Listings'),
        dates: coursesArr.map((c: any) => c.createdAt),
        raw: { courses: coursesArr, tutor },
        revenue,
        revenueDates: undefined,
      };
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
