import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';

interface AchievementCriteria {
  type: 'wins' | 'sweeps' | 'fastestWinMs' | 'gamesPlayed' | 'challengesCompleted' | 'votesReceived' | 'challengeStreak';
  threshold: number;
  mode?: 'FIVE_CARDS' | 'CASSINO';
}

const DEFAULT_ACHIEVEMENTS: { code: string; name: string; description: string; criteria: AchievementCriteria }[] = [
  { code: 'CARDS_FIRST_WIN', name: 'First Win', description: 'Win your first card game.', criteria: { type: 'wins', threshold: 1 } },
  { code: 'CARDS_10_WINS', name: 'Regular', description: 'Win 10 card games.', criteria: { type: 'wins', threshold: 10 } },
  { code: 'CARDS_50_WINS', name: 'Card Shark', description: 'Win 50 card games.', criteria: { type: 'wins', threshold: 50 } },
  { code: 'CASSINO_5_SWEEPS', name: 'Clean Sweep', description: 'Sweep the table 5 times in Cassino.', criteria: { type: 'sweeps', threshold: 5, mode: 'CASSINO' } },
  { code: 'CARDS_FAST_WIN', name: 'Lightning Round', description: 'Win a card game in under 60 seconds.', criteria: { type: 'fastestWinMs', threshold: 60_000 } },
  { code: 'CARDS_100_PLAYED', name: 'Dedicated Player', description: 'Play 100 card games.', criteria: { type: 'gamesPlayed', threshold: 100 } },
];

const CHALLENGE_ACHIEVEMENTS: { code: string; name: string; description: string; criteria: AchievementCriteria }[] = [
  { code: 'CHALLENGE_FIRST_ENTRY', name: 'First Challenge', description: 'Submit your first challenge entry.', criteria: { type: 'challengesCompleted', threshold: 1 } },
  { code: 'CHALLENGE_10_COMPLETED', name: 'Challenger', description: 'Submit 10 challenge entries.', criteria: { type: 'challengesCompleted', threshold: 10 } },
  { code: 'CHALLENGE_100_COMPLETED', name: 'Challenge Veteran', description: 'Submit 100 challenge entries.', criteria: { type: 'challengesCompleted', threshold: 100 } },
  { code: 'CHALLENGE_100_VOTES', name: 'Crowd Favorite', description: 'Receive 100 votes across your entries.', criteria: { type: 'votesReceived', threshold: 100 } },
  { code: 'CHALLENGE_STREAK_7', name: 'On a Roll', description: 'Reach a 7-day challenge streak.', criteria: { type: 'challengeStreak', threshold: 7 } },
  { code: 'CHALLENGE_STREAK_30', name: 'Unstoppable', description: 'Reach a 30-day challenge streak.', criteria: { type: 'challengeStreak', threshold: 30 } },
];

@Injectable()
export class AchievementsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    for (const a of [...DEFAULT_ACHIEVEMENTS, ...CHALLENGE_ACHIEVEMENTS]) {
      await this.prisma.achievement.upsert({
        where: { code: a.code },
        create: { code: a.code, name: a.name, description: a.description, criteria: a.criteria as any },
        update: { name: a.name, description: a.description, criteria: a.criteria as any },
      });
    }
  }

  async listAll() {
    return this.prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async listMine(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /** Called after every finished card game to unlock any newly-earned achievements. */
  async evaluateForUser(userId: string, mode: 'FIVE_CARDS' | 'CASSINO') {
    const stats = await this.prisma.cardGameStats.findUnique({ where: { userId_mode: { userId, mode } } });
    if (!stats) return;

    const achievements = await this.prisma.achievement.findMany();
    const already = new Set(
      (await this.prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })).map(
        (u) => u.achievementId,
      ),
    );

    for (const achievement of achievements) {
      if (already.has(achievement.id)) continue;
      const criteria = achievement.criteria as unknown as AchievementCriteria;
      if (criteria.mode && criteria.mode !== mode) continue;

      const value =
        criteria.type === 'wins'
          ? stats.wins
          : criteria.type === 'sweeps'
            ? stats.sweeps
            : criteria.type === 'gamesPlayed'
              ? stats.gamesPlayed
              : stats.fastestWinMs !== null && stats.fastestWinMs !== undefined
                ? stats.fastestWinMs
                : null;
      if (value === null) continue;

      const earned = criteria.type === 'fastestWinMs' ? value <= criteria.threshold : value >= criteria.threshold;
      if (!earned) continue;

      await this.prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.expoPushToken) {
        await sendPushNotification(user.expoPushToken, 'Achievement unlocked!', achievement.name);
      }
    }
  }

  /** Called after a challenge entry is submitted, voted on, or a challenge is finalized. */
  async evaluateChallengeAchievementsForUser(userId: string) {
    const challengeCriteriaTypes = new Set(['challengesCompleted', 'votesReceived', 'challengeStreak']);
    const achievements = (await this.prisma.achievement.findMany()).filter((a) =>
      challengeCriteriaTypes.has((a.criteria as unknown as AchievementCriteria).type),
    );
    if (achievements.length === 0) return;

    const already = new Set(
      (await this.prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })).map(
        (u) => u.achievementId,
      ),
    );

    const [entriesCount, votesReceived, streak] = await Promise.all([
      this.prisma.challengeEntry.count({ where: { userId } }),
      this.prisma.challengeEntryVote.count({ where: { entry: { userId } } }),
      this.prisma.userChallengeStreak.findUnique({ where: { userId } }),
    ]);

    for (const achievement of achievements) {
      if (already.has(achievement.id)) continue;
      const criteria = achievement.criteria as unknown as AchievementCriteria;

      const value =
        criteria.type === 'challengesCompleted'
          ? entriesCount
          : criteria.type === 'votesReceived'
            ? votesReceived
            : criteria.type === 'challengeStreak'
              ? (streak?.currentStreak ?? 0)
              : null;
      if (value === null || value < criteria.threshold) continue;

      await this.prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.expoPushToken) {
        await sendPushNotification(user.expoPushToken, 'Achievement unlocked!', achievement.name);
      }
    }
  }
}
