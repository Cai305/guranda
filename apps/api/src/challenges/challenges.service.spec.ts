// AchievementsService transitively imports common/push.ts -> expo-server-sdk,
// an ESM-only package Jest can't parse without extra transform config. We
// never construct the real AchievementsService below (a hand-rolled stub is
// passed into ChallengesService instead) — a factory-based mock is required
// here (not the bare `jest.mock(path)` form) because that form still
// `require()`s the real module once to infer the automock shape, which would
// trigger the same unparseable import.
jest.mock('../achievements/achievements.service', () => ({ AchievementsService: jest.fn() }));

import { ChallengesService } from './challenges.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

function makePrismaMock() {
  const challenges = new Map<string, any>();
  const entries = new Map<string, any>();
  const likes = new Map<string, any>(); // key `${entryId}:${userId}`
  const votes = new Map<string, any>(); // key `${entryId}:${userId}`
  const categoryStats = new Map<string, any>(); // key `${userId}:${category}`
  const streaks = new Map<string, any>(); // key userId
  const profiles = new Map<string, any>(); // key userId
  let idCounter = 0;

  const entriesForChallenge = (challengeId: string) =>
    [...entries.values()].filter((e) => e.challengeId === challengeId);
  const likesForEntry = (entryId: string) =>
    [...likes.values()].filter((l) => l.entryId === entryId);
  const votesForEntry = (entryId: string) =>
    [...votes.values()].filter((v) => v.entryId === entryId);

  return {
    _stores: { challenges, entries, likes, votes, categoryStats, streaks, profiles },
    challenge: {
      findUnique: jest.fn(async ({ where }: any) => challenges.get(where.id) ?? null),
      findMany: jest.fn(async ({ where, take, skip }: any) => {
        let rows = [...challenges.values()];
        if (where?.status) rows = rows.filter((c) => c.status === where.status);
        if (where?.category) rows = rows.filter((c) => c.category === where.category);
        if (where?.startAt?.lte) rows = rows.filter((c) => c.startAt <= where.startAt.lte);
        if (where?.endAt?.lte) rows = rows.filter((c) => c.endAt <= where.endAt.lte);
        if (skip) rows = rows.slice(skip);
        if (take) rows = rows.slice(0, take);
        return rows;
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = `challenge-${++idCounter}`;
        const record = { id, createdAt: new Date(), ...data };
        challenges.set(id, record);
        return record;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const updated = { ...challenges.get(where.id), ...data };
        challenges.set(where.id, updated);
        return updated;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const [id, c] of challenges) {
          if (where.status && c.status !== where.status) continue;
          if (where.startAt?.lte && !(c.startAt <= where.startAt.lte)) continue;
          challenges.set(id, { ...c, ...data });
          count++;
        }
        return { count };
      }),
    },
    challengeEntry: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return entries.get(where.id) ?? null;
        if (where.challengeId_userId) {
          const { challengeId, userId } = where.challengeId_userId;
          return [...entries.values()].find((e) => e.challengeId === challengeId && e.userId === userId) ?? null;
        }
        return null;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        let rows = entriesForChallenge(where.challengeId);
        if (where.status) rows = rows.filter((e) => e.status === where.status);
        return rows.map((e) => ({ ...e, votes: votesForEntry(e.id), likes: likesForEntry(e.id) }));
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = `entry-${++idCounter}`;
        const record = { id, status: 'PUBLISHED', createdAt: new Date(), ...data };
        entries.set(id, record);
        return record;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const updated = { ...entries.get(where.id), ...data };
        entries.set(where.id, updated);
        return updated;
      }),
    },
    challengeEntryLike: {
      create: jest.fn(async ({ data }: any) => {
        const key = `${data.entryId}:${data.userId}`;
        if (likes.has(key)) throw new Error('unique constraint');
        likes.set(key, data);
        return data;
      }),
      delete: jest.fn(async ({ where }: any) => {
        const key = `${where.entryId_userId.entryId}:${where.entryId_userId.userId}`;
        likes.delete(key);
      }),
    },
    challengeEntryVote: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = `${where.entryId_userId.entryId}:${where.entryId_userId.userId}`;
        const record = votes.has(key) ? { ...votes.get(key), ...update } : create;
        votes.set(key, record);
        return record;
      }),
    },
    challengeEntryComment: {
      create: jest.fn(async ({ data }: any) => ({ id: `comment-${++idCounter}`, createdAt: new Date(), ...data, author: { id: data.authorId, username: 'u', profile: null } })),
      findMany: jest.fn(async () => []),
    },
    challengeCategoryStat: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = `${where.userId_category.userId}:${where.userId_category.category}`;
        const existing = categoryStats.get(key);
        const record = existing
          ? { ...existing, xp: existing.xp + (update.xp?.increment ?? 0), entriesCount: existing.entriesCount + (update.entriesCount?.increment ?? 0), wins: existing.wins + (update.wins?.increment ?? 0) }
          : create;
        categoryStats.set(key, record);
        return record;
      }),
    },
    userChallengeStreak: {
      findUnique: jest.fn(async ({ where }: any) => streaks.get(where.userId) ?? null),
      create: jest.fn(async ({ data }: any) => {
        streaks.set(data.userId, data);
        return data;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const updated = { ...streaks.get(where.userId), ...data };
        streaks.set(where.userId, updated);
        return updated;
      }),
    },
    userProfile: {
      update: jest.fn(async ({ where, data }: any) => {
        const existing = profiles.get(where.userId) ?? { userId: where.userId, xp: 0 };
        const updated = { ...existing, xp: existing.xp + (data.xp?.increment ?? 0) };
        profiles.set(where.userId, updated);
        return updated;
      }),
    },
  };
}

function makeAchievementsMock() {
  return { evaluateChallengeAchievementsForUser: jest.fn(async () => {}) };
}

function makeGeneratorMock() {
  return { generate: jest.fn(async () => []) };
}

function makeNotificationsMock() {
  return { create: jest.fn(async () => ({})) };
}

describe('ChallengesService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let achievements: ReturnType<typeof makeAchievementsMock>;
  let generator: ReturnType<typeof makeGeneratorMock>;
  let notifications: ReturnType<typeof makeNotificationsMock>;
  let service: ChallengesService;

  beforeEach(() => {
    prisma = makePrismaMock();
    achievements = makeAchievementsMock();
    generator = makeGeneratorMock();
    notifications = makeNotificationsMock();
    service = new ChallengesService(prisma as any, achievements as any, generator as any, notifications as any);
  });

  function seedActiveChallenge(overrides: Partial<any> = {}) {
    const id = `challenge-${Math.random()}`;
    const challenge = {
      id,
      status: 'ACTIVE',
      category: 'DANCE',
      xpReward: 50,
      bonusXpReward: 100,
      startAt: new Date(Date.now() - 60_000),
      endAt: new Date(Date.now() + 3_600_000),
      ...overrides,
    };
    prisma._stores.challenges.set(id, challenge);
    return challenge;
  }

  describe('submitEntry', () => {
    it('awards xpReward to the profile and the category stat, and advances the streak', async () => {
      const challenge = seedActiveChallenge();
      await service.submitEntry('user-1', challenge.id, { mediaUrl: 'https://x.com/a.jpg', mediaType: 'IMAGE' });

      expect(prisma._stores.profiles.get('user-1').xp).toBe(50);
      const stat = prisma._stores.categoryStats.get('user-1:DANCE');
      expect(stat.xp).toBe(50);
      expect(stat.entriesCount).toBe(1);
      const streak = prisma._stores.streaks.get('user-1');
      expect(streak.currentStreak).toBe(1);
      expect(achievements.evaluateChallengeAchievementsForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects a second entry from the same user on the same challenge', async () => {
      const challenge = seedActiveChallenge();
      await service.submitEntry('user-1', challenge.id, { mediaUrl: 'https://x.com/a.jpg', mediaType: 'IMAGE' });
      await expect(
        service.submitEntry('user-1', challenge.id, { mediaUrl: 'https://x.com/b.jpg', mediaType: 'IMAGE' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an entry on a non-ACTIVE challenge', async () => {
      const challenge = seedActiveChallenge({ status: 'DRAFT' });
      await expect(
        service.submitEntry('user-1', challenge.id, { mediaUrl: 'https://x.com/a.jpg', mediaType: 'IMAGE' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('voteEntry', () => {
    it('rejects a self-vote', async () => {
      const challenge = seedActiveChallenge();
      const entry = await service.submitEntry('author-1', challenge.id, { mediaUrl: 'https://x.com/a.jpg', mediaType: 'IMAGE' });
      await expect(service.voteEntry('author-1', entry.id, 8)).rejects.toThrow(ForbiddenException);
    });

    it('rejects an out-of-range vote value', async () => {
      const challenge = seedActiveChallenge();
      const entry = await service.submitEntry('author-1', challenge.id, { mediaUrl: 'https://x.com/a.jpg', mediaType: 'IMAGE' });
      await expect(service.voteEntry('voter-1', entry.id, 11)).rejects.toThrow(BadRequestException);
      await expect(service.voteEntry('voter-1', entry.id, 0)).rejects.toThrow(BadRequestException);
    });

    it('records a valid vote from another user', async () => {
      const challenge = seedActiveChallenge();
      const entry = await service.submitEntry('author-1', challenge.id, { mediaUrl: 'https://x.com/a.jpg', mediaType: 'IMAGE' });
      const vote = await service.voteEntry('voter-1', entry.id, 7);
      expect(vote.value).toBe(7);
    });
  });

  describe('adminEnd / finalizeChallenge', () => {
    it('awards bonus XP to the highest-average-vote entry, using like count as a tiebreak', async () => {
      const challenge = seedActiveChallenge();
      const entryA = await service.submitEntry('user-a', challenge.id, { mediaUrl: 'https://x.com/a.jpg', mediaType: 'IMAGE' });
      const entryB = await service.submitEntry('user-b', challenge.id, { mediaUrl: 'https://x.com/b.jpg', mediaType: 'IMAGE' });

      // Both entries tie at an average vote of 8; B has more likes, so B should win.
      await service.voteEntry('voter-1', entryA.id, 8);
      await service.voteEntry('voter-1', entryB.id, 8);
      prisma._stores.likes.set(`${entryB.id}:extra-liker`, { entryId: entryB.id, userId: 'extra-liker' });

      await service.adminEnd(challenge.id);

      const ended = prisma._stores.challenges.get(challenge.id);
      expect(ended.status).toBe('ENDED');
      expect(ended.winningEntryId).toBe(entryB.id);
      expect(prisma._stores.profiles.get('user-b').xp).toBe(50 + 100); // participation + bonus
      expect(prisma._stores.profiles.get('user-a').xp).toBe(50); // participation only
    });

    it('is a no-op when the challenge is already ENDED', async () => {
      const challenge = seedActiveChallenge({ status: 'ENDED' });
      const result = await service.adminEnd(challenge.id);
      expect(result!.status).toBe('ENDED');
      expect(prisma.challenge.update).not.toHaveBeenCalled();
    });
  });

  describe('sweep', () => {
    it('activates a DRAFT challenge whose startAt has passed', async () => {
      const challenge = seedActiveChallenge({
        status: 'DRAFT',
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 3_600_000),
      });
      await service.sweep();
      expect(prisma._stores.challenges.get(challenge.id).status).toBe('ACTIVE');
    });

    it('ends an ACTIVE challenge whose endAt has passed', async () => {
      const challenge = seedActiveChallenge({ endAt: new Date(Date.now() - 1000) });
      await service.sweep();
      expect(prisma._stores.challenges.get(challenge.id).status).toBe('ENDED');
    });
  });
});
