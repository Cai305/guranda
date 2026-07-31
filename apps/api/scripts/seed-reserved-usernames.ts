// Starter reserved-brand blocklist — re-runnable, not a migration. Extend
// via POST /admin/reserved-usernames (or just add more lines here and
// re-run) as more names come up. 1-2 character names never need an entry
// here — that's a pure length check in username-validation.util.ts.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STARTER_RESERVED: { label: string; reason: string }[] = [
  { label: 'apple', reason: 'brand' },
  { label: 'applemusic', reason: 'brand' },
  { label: 'shoprite', reason: 'brand' },
  { label: 'checkers', reason: 'brand' },
  { label: 'google', reason: 'brand' },
  { label: 'microsoft', reason: 'brand' },
  { label: 'amazon', reason: 'brand' },
  { label: 'facebook', reason: 'brand' },
  { label: 'instagram', reason: 'brand' },
  { label: 'tiktok', reason: 'brand' },
  { label: 'whatsapp', reason: 'brand' },
  { label: 'samsung', reason: 'brand' },
  { label: 'nike', reason: 'brand' },
  { label: 'adidas', reason: 'brand' },
  { label: 'cocacola', reason: 'brand' },
  { label: 'pepsi', reason: 'brand' },
  { label: 'pnp', reason: 'brand' },
  { label: 'woolworths', reason: 'brand' },
  { label: 'spar', reason: 'brand' },
  { label: 'mtn', reason: 'brand' },
  { label: 'vodacom', reason: 'brand' },
  { label: 'telkom', reason: 'brand' },
  { label: 'cellc', reason: 'brand' },
  { label: 'sars', reason: 'brand' },
  { label: 'absa', reason: 'brand' },
  { label: 'fnb', reason: 'brand' },
  { label: 'nedbank', reason: 'brand' },
  { label: 'standardbank', reason: 'brand' },
  { label: 'capitecbank', reason: 'brand' },
];

async function main() {
  let created = 0;
  for (const entry of STARTER_RESERVED) {
    const result = await prisma.reservedUsername.upsert({
      where: { label: entry.label },
      update: {},
      create: entry,
    });
    if (result) created++;
  }
  console.log(`Reserved-username seed complete. ${STARTER_RESERVED.length} entries ensured present.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
