import { BadRequestException, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { getDisplayedReputation, nextLevelThreshold, levelLadder } from '../users/reputation.util';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Four narrated pillars (Reputation/Growth/Rank/Impact) — each a real,
   * already-tracked signal, not an invented number. Reputation/Rank reuse
   * the existing username-snapshot reputation system; Growth reuses the
   * Challenges XP already on UserProfile; Impact composes challenges
   * completed + gifts received, the same two fields snapshotted below so
   * the "this week" delta stays consistent with what's actually stored.
   */
  async computePillars(userId: string) {
    const [{ live, subscribers, reputation, level }, profile, challengesCompleted] = await Promise.all([
      getDisplayedReputation(this.prisma, userId),
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.challengeEntry.count({ where: { userId } }),
    ]);

    const xp = profile?.xp ?? 0;
    const giftsReceived = live.giftsReceived;
    const impactValue = challengesCompleted * 10 + giftsReceived * 2;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snapshot = await this.prisma.profileMetricsSnapshot.findFirst({
      where: { userId, capturedAt: { lte: weekAgo } },
      orderBy: { capturedAt: 'desc' },
    });
    const snapshotImpact = snapshot ? snapshot.challengesCompleted * 10 + snapshot.giftsReceived * 2 : null;
    const next = nextLevelThreshold(subscribers);

    return {
      reputation: {
        value: Math.round(reputation),
        deltaWeek: snapshot ? Math.round(reputation - snapshot.reputation) : null,
      },
      growth: {
        xp,
        deltaWeek: snapshot ? xp - snapshot.xp : null,
      },
      rank: {
        level,
        subscribers: Math.round(subscribers),
        nextLevel: next?.nextLevel ?? null,
        subscribersNeeded: next ? Math.max(0, Math.round(next.subscribersNeeded)) : null,
        ladder: levelLadder(),
      },
      impact: {
        value: impactValue,
        deltaWeek: snapshotImpact !== null ? impactValue - snapshotImpact : null,
      },
    };
  }

  // The companion's stage IS the reputation ladder position (Nano/Micro/
  // Midtier/Macro/Mega Influencer), not a separate counter — growing your
  // reputation visibly grows your pet, instead of the two being unrelated.
  async getCompanion(userId: string) {
    const { subscribers, level } = await getDisplayedReputation(this.prisma, userId);
    const ladder = levelLadder();
    const stage = Math.max(0, ladder.findIndex((t) => t.level === level));
    const next = nextLevelThreshold(subscribers);

    const companion = await this.prisma.companion.upsert({
      where: { userId },
      create: { userId, stage },
      // Keep stage in sync with the reputation ladder on every read — cheap
      // since this only ever moves forward (reputation doesn't decrease).
      update: stage > 0 ? { stage, lastEvolvedAt: new Date() } : {},
    });

    return {
      ...companion,
      stage,
      level,
      subscribersIntoStage: Math.max(0, Math.round(subscribers - ladder[stage].min)),
      subscribersForNextStage: next ? Math.max(0, Math.round(next.subscribersNeeded)) : null,
    };
  }

  async renameCompanion(userId: string, name: string) {
    const trimmed = (name || '').trim().slice(0, 24);
    if (!trimmed) throw new BadRequestException('Give your companion a name.');
    await this.prisma.companion.upsert({
      where: { userId },
      create: { userId, name: trimmed },
      update: { name: trimmed },
    });
    return this.getCompanion(userId);
  }

  async listMyBadges(userId: string) {
    const [owned, allBadges] = await Promise.all([
      this.prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { mintedAt: 'desc' },
      }),
      this.prisma.badge.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    const ownedIds = new Set(owned.map((o) => o.badgeId));
    return {
      owned: owned.map((o) => ({ ...o.badge, mintedAt: o.mintedAt })),
      locked: allBadges.filter((b) => !ownedIds.has(b.id)),
    };
  }

  async getHQ(userId: string) {
    const [pillars, companion, badges] = await Promise.all([
      this.computePillars(userId),
      this.getCompanion(userId),
      this.listMyBadges(userId),
    ]);
    return { pillars, companion, badges };
  }

  // Runs once a day so pillar cards can diff against "the value ~7 days
  // ago" — same pattern as the CCR/daily-challenge crons elsewhere.
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async writeSnapshotsForActiveUsers() {
    // "Active" = touched something in the last 30 days — no point snapshotting
    // fully dormant accounts every day forever.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUserIds = await this.prisma.post.findMany({
      where: { createdAt: { gte: since } },
      distinct: ['authorId'],
      select: { authorId: true },
      take: 5000,
    });
    const ids = [...new Set(recentUserIds.map((r) => r.authorId))];

    for (const userId of ids) {
      const [{ live, reputation, subscribers }, profile, challengesCompleted] = await Promise.all([
        getDisplayedReputation(this.prisma, userId),
        this.prisma.userProfile.findUnique({ where: { userId } }),
        this.prisma.challengeEntry.count({ where: { userId } }),
      ]);
      await this.prisma.profileMetricsSnapshot.create({
        data: {
          userId,
          reputation,
          subscribers,
          xp: profile?.xp ?? 0,
          challengesCompleted,
          giftsReceived: live.giftsReceived,
        },
      });
    }
    return { snapshotted: ids.length };
  }
}
