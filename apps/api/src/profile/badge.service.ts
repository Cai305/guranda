import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Scarce, ownable collectibles — distinct from the generic, uncapped
// Achievement/UserAchievement unlocks. Some badges are capped by maxSupply
// (first-N style scarcity, checked with tryMintScarce); others are uncapped
// and auto-minted when a specific Achievement unlocks (mintUncapped).
const SEED_BADGES: { code: string; name: string; description: string; icon: string; maxSupply: number | null }[] = [
  { code: 'FOUNDER', name: 'Founder', description: 'One of the first 10,000 people on Guranda.', icon: '🏆', maxSupply: 10000 },
  { code: 'OG_CREATOR', name: 'OG Creator', description: 'Among the first 500 people to post on Guranda.', icon: '✍️', maxSupply: 500 },
  { code: 'EARLY_LIVE_HOST', name: 'Early Live Host', description: 'Among the first 1,000 people to go live on Guranda.', icon: '📡', maxSupply: 1000 },
  { code: 'CHALLENGE_CHAMPION', name: 'Challenge Champion', description: 'Completed 10 challenges.', icon: '🎯', maxSupply: null },
  { code: 'CENTURY_CLUB', name: 'Century Club', description: 'Completed 100 challenges.', icon: '💯', maxSupply: null },
  { code: 'CARD_SHARK', name: 'Card Shark', description: 'Won 50 card games.', icon: '🃏', maxSupply: null },
  { code: 'CCR_CREATOR', name: 'CCR Creator', description: 'Earned your first Content Contribution payout.', icon: '💰', maxSupply: null },
];

@Injectable()
export class BadgeService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    for (const b of SEED_BADGES) {
      await this.prisma.badge.upsert({
        where: { code: b.code },
        create: b,
        update: { name: b.name, description: b.description, icon: b.icon, maxSupply: b.maxSupply },
      });
    }
  }

  /**
   * First-N scarcity mint. Wrapped in a transaction so two concurrent
   * mints can't both read mintedCount < maxSupply before either writes —
   * the increment and the ownership row are committed atomically.
   * No-ops (returns null) once the badge is exhausted or already owned.
   */
  async tryMintScarce(userId: string, code: string) {
    return this.prisma.$transaction(async (tx) => {
      const badge = await tx.badge.findUnique({ where: { code } });
      if (!badge || badge.maxSupply === null) return null;
      const already = await tx.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });
      if (already) return null;
      if (badge.mintedCount >= badge.maxSupply) return null;
      await tx.badge.update({ where: { id: badge.id }, data: { mintedCount: { increment: 1 } } });
      return tx.userBadge.create({ data: { userId, badgeId: badge.id } });
    });
  }

  /** Uncapped badges auto-minted alongside a matching Achievement unlock. */
  async mintUncapped(userId: string, code: string) {
    const badge = await this.prisma.badge.findUnique({ where: { code } });
    if (!badge || badge.maxSupply !== null) return null;
    try {
      return await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
    } catch {
      return null; // already owned — @@unique([userId, badgeId]) rejected it
    }
  }
}
