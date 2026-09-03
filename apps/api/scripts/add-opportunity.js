// Adds one real "Opportunities" card announcing recently-shipped features
// (Discovery, Scan to Pay, Achievements, chat improvements) — same shape
// as any other PLATFORM_UPDATE campaign, surfaced in the mobile app's
// Home > Opportunities carousel (opportunities.service.ts's getFeed()).
//
// PLATFORM_UPDATE campaigns are deliberately excluded from the public
// POST /campaigns API (campaigns.service.ts: "Platform updates are
// created by admins, not this endpoint") — a direct DB insert (this
// script) is the only path by design, since anyone hitting a public API
// must never be able to impersonate an official platform announcement.
//
// Usage — run against whichever database DATABASE_URL points at. For
// production, set the production DATABASE_URL (from the Render dashboard)
// for this one command only; never hardcode it here or commit it:
//
//   DATABASE_URL="<production DATABASE_URL>" node scripts/add-opportunity.js
//
// For local dev, just run it as-is (uses apps/api/.env via Prisma's
// default env loading).
//
// Safe to re-run accidentally-once, but it's a plain create (not an
// upsert) — running it twice creates two rows, so check the campaign
// doesn't already exist (e.g. `SELECT title FROM "Campaign" WHERE
// type='PLATFORM_UPDATE' AND status='ACTIVE'`) before re-running.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

  const campaign = await prisma.campaign.create({
    data: {
      type: 'PLATFORM_UPDATE',
      status: 'ACTIVE',
      title: 'Discovery is here',
      description: 'Watch and earn on the new video feed, pay any merchant with Scan to Pay, and unlock real achievement badges as you use the app.',
      goal: 'Awareness',
      rewardLabel: 'New feature',
      estimatedMinutes: null,
      actionLabel: 'Explore',
      actionRoute: { name: 'Discovery' },
      coverImageUrl: null,
      budget: 0,
      targetMinReputationLevel: null,
      targetCategories: [],
      createdByUserId: null,
      createdByBusinessId: null,
      startAt: now,
      endAt,
    },
  });

  console.log('Created opportunity:', JSON.stringify(campaign, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
