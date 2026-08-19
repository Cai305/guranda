// One-off seed for sample Property listings.
//
// There's no free, key-less API for real SA listing prices — Property24 and
// Private Property don't expose public APIs, and scraper services (Apify)
// require a paid token. So real addresses are geocoded live via
// OpenStreetMap's free Nominatim API (no key, no cost) and paired with
// realistic curated listing details (price/bedrooms/etc.), the same way the
// other seed-*.ts scripts curate their data.
//
// Run with: npx ts-node prisma/seed-property.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'GurandaApp-PropertySeed/1.0 (dev seed script)';

const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop',
];

// Real SA locations to geocode — Nominatim resolves these to an actual
// street/suburb address via free-text search.
const LISTINGS: Array<{
  query: string;
  title: string;
  kind: 'HOUSE' | 'APARTMENT' | 'COMMERCIAL';
  listingType: 'RENT' | 'SALE';
  price: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
}> = [
  { query: 'Rivonia, Sandton, Johannesburg, South Africa', title: 'Modern 3-Bed Family Home, Rivonia', kind: 'HOUSE', listingType: 'SALE', price: 3250000, bedrooms: 3, bathrooms: 2, description: 'Secure family home with garden and double garage, walking distance to Rivonia Village.' },
  { query: 'Melrose Arch, Johannesburg, South Africa', title: 'Melrose Arch Loft Apartment', kind: 'APARTMENT', listingType: 'RENT', price: 18500, bedrooms: 2, bathrooms: 2, description: 'Fully furnished loft in the heart of Melrose Arch, walk to restaurants and offices.' },
  { query: 'Green Point, Cape Town, South Africa', title: 'Sea-Facing Apartment, Green Point', kind: 'APARTMENT', listingType: 'SALE', price: 2850000, bedrooms: 2, bathrooms: 1, description: 'Bright open-plan apartment minutes from the Waterfront and Green Point Park.' },
  { query: 'Century City, Cape Town, South Africa', title: 'Century City Canal-Side Apartment', kind: 'APARTMENT', listingType: 'RENT', price: 14200, bedrooms: 2, bathrooms: 2, description: 'Modern secure estate living with canal views and on-site gym.' },
  { query: 'Umhlanga Ridge, Durban, South Africa', title: 'Umhlanga Ridge Penthouse', kind: 'APARTMENT', listingType: 'SALE', price: 4750000, bedrooms: 3, bathrooms: 3, description: 'Top-floor penthouse with panoramic ocean views, close to Gateway Mall.' },
  { query: 'Waterkloof, Pretoria, South Africa', title: 'Waterkloof Family Home', kind: 'HOUSE', listingType: 'RENT', price: 22000, bedrooms: 4, bathrooms: 3, description: 'Spacious garden home in leafy Waterkloof, staff quarters and pool.' },
  { query: 'Stellenbosch Central, Stellenbosch, South Africa', title: 'Student-Friendly House, Stellenbosch Central', kind: 'HOUSE', listingType: 'RENT', price: 12500, bedrooms: 4, bathrooms: 2, description: 'Walking distance to Stellenbosch University, shared garden and braai area.' },
  { query: 'Ballito, KwaZulu-Natal, South Africa', title: 'Ballito Beachfront Apartment', kind: 'APARTMENT', listingType: 'SALE', price: 3600000, bedrooms: 2, bathrooms: 2, description: 'Steps from the beach, secure complex with pool and 24-hour security.' },
  { query: 'Menlyn, Pretoria, South Africa', title: 'Menlyn Retail Unit', kind: 'COMMERCIAL', listingType: 'RENT', price: 45000, bedrooms: 0, bathrooms: 1, description: 'Ground-floor retail space near Menlyn Park Shopping Centre, high foot traffic.' },
  { query: 'Fourways, Johannesburg, South Africa', title: 'Fourways Office Suite', kind: 'COMMERCIAL', listingType: 'SALE', price: 5200000, bedrooms: 0, bathrooms: 2, description: 'Modern office suite with parking bays, close to William Nicol Drive.' },
];

async function geocode(query: string): Promise<string | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&countrycodes=za&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const results = (await res.json()) as Array<{ display_name: string }>;
  return results[0]?.display_name ?? null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const seededTitles = new Set(LISTINGS.map((l) => l.title));
  const already = await prisma.property.findMany({
    where: { title: { in: Array.from(seededTitles) } },
    select: { title: true },
  });
  const alreadyTitles = new Set(already.map((p) => p.title));
  const toSeed = LISTINGS.filter((l) => !alreadyTitles.has(l.title));
  if (toSeed.length === 0) {
    console.log('All geocoded property listings already present.');
    return;
  }

  const agent = await prisma.user.findFirst({ select: { id: true } });
  if (!agent) {
    console.log('No users in DB yet — skipping Property seed.');
    return;
  }

  const rows: Array<{
    agentId: string;
    title: string;
    kind: string;
    listingType: string;
    price: number;
    address: string;
    description: string;
    images: string[];
    bedrooms: number;
    bathrooms: number;
  }> = [];

  for (const listing of toSeed) {
    let address: string;
    try {
      // Nominatim usage policy: max 1 request/sec, identify with a User-Agent.
      const geocoded = await geocode(listing.query);
      address = geocoded ?? listing.query;
    } catch (e) {
      console.warn(`Geocoding failed for "${listing.query}", falling back to raw query.`, e);
      address = listing.query;
    }

    rows.push({
      agentId: agent.id,
      title: listing.title,
      kind: listing.kind,
      listingType: listing.listingType,
      price: listing.price,
      address,
      description: listing.description,
      images: PROPERTY_IMAGES,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
    });

    await sleep(1100);
  }

  await prisma.property.createMany({ data: rows });
  console.log(`Seeded ${rows.length} property listings (addresses geocoded via OpenStreetMap Nominatim)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
