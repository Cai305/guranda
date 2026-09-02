import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';
import { BadgeService } from '../profile/badge.service';
import { NotificationsService } from '../notifications/notifications.service';

// Uncapped Badge.code counterparts for a small subset of achievements —
// unlocking these achievements also mints the matching collectible badge.
const ACHIEVEMENT_BADGE_MAP: Record<string, string> = {
  CARDS_50_WINS: 'CARD_SHARK',
  CHALLENGE_10_COMPLETED: 'CHALLENGE_CHAMPION',
  CHALLENGE_100_COMPLETED: 'CENTURY_CLUB',
};

interface AchievementCriteria {
  type:
    | 'wins'
    | 'sweeps'
    | 'fastestWinMs'
    | 'gamesPlayed'
    | 'challengesCompleted'
    | 'votesReceived'
    | 'challengeStreak'
    | 'postsCreated'
    | 'followersCount'
    | 'liveStreamsHosted'
    | 'giftsSent'
    | 'giftsReceived'
    | 'messagesSent'
    | 'relationshipActive';
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

// Platform-wide achievements — spans the app beyond cards/challenges:
// posting, follows, live hosting, gifting, chat, and relationships.
const PLATFORM_ACHIEVEMENTS: { code: string; name: string; description: string; criteria: AchievementCriteria }[] = [
  { code: 'POSTS_FIRST', name: 'First Post', description: 'Share your first post.', criteria: { type: 'postsCreated', threshold: 1 } },
  { code: 'POSTS_10', name: 'Storyteller', description: 'Share 10 posts.', criteria: { type: 'postsCreated', threshold: 10 } },
  { code: 'POSTS_100', name: 'Content Machine', description: 'Share 100 posts.', criteria: { type: 'postsCreated', threshold: 100 } },
  { code: 'SOCIAL_10_FOLLOWERS', name: 'Rising Star', description: 'Reach 10 followers.', criteria: { type: 'followersCount', threshold: 10 } },
  { code: 'SOCIAL_100_FOLLOWERS', name: 'Influencer', description: 'Reach 100 followers.', criteria: { type: 'followersCount', threshold: 100 } },
  { code: 'SOCIAL_1000_FOLLOWERS', name: 'Celebrity', description: 'Reach 1,000 followers.', criteria: { type: 'followersCount', threshold: 1000 } },
  { code: 'LIVE_FIRST_STREAM', name: 'On Air', description: 'Host your first live stream.', criteria: { type: 'liveStreamsHosted', threshold: 1 } },
  { code: 'LIVE_10_STREAMS', name: 'Broadcaster', description: 'Host 10 live streams.', criteria: { type: 'liveStreamsHosted', threshold: 10 } },
  { code: 'GIFTS_FIRST_SENT', name: 'Generous', description: 'Send your first gift.', criteria: { type: 'giftsSent', threshold: 1 } },
  { code: 'GIFTS_10_SENT', name: 'Big Spender', description: 'Send 10 gifts.', criteria: { type: 'giftsSent', threshold: 10 } },
  { code: 'GIFTS_FIRST_RECEIVED', name: 'Beloved', description: 'Receive your first gift.', criteria: { type: 'giftsReceived', threshold: 1 } },
  { code: 'CHAT_100_MESSAGES', name: 'Chatterbox', description: 'Send 100 chat messages.', criteria: { type: 'messagesSent', threshold: 100 } },
  { code: 'CHAT_1000_MESSAGES', name: 'Social Butterfly', description: 'Send 1,000 chat messages.', criteria: { type: 'messagesSent', threshold: 1000 } },
  { code: 'RELATIONSHIP_FORMED', name: 'Better Together', description: 'Form an active relationship on Guranda.', criteria: { type: 'relationshipActive', threshold: 1 } },
];

@Injectable()
export class AchievementsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private badgeService: BadgeService,
    private notifications: NotificationsService,
  ) {}

  private async mintLinkedBadge(userId: string, achievementCode: string) {
    const badgeCode = ACHIEVEMENT_BADGE_MAP[achievementCode];
    if (badgeCode) await this.badgeService.mintUncapped(userId, badgeCode);
  }

  // Shared by every evaluate*ForUser method below — records the unlock,
  // mints any linked collectible badge, and notifies (push + in-app), the
  // same three steps each evaluate method used to duplicate inline.
  private async unlockAndNotify(userId: string, achievement: { id: string; code: string; name: string }) {
    await this.prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
    await this.mintLinkedBadge(userId, achievement.code);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.expoPushToken) {
      await sendPushNotification(user.expoPushToken, 'Achievement unlocked!', achievement.name);
    }
    await this.notifications.create(
      userId,
      'achievement.unlocked',
      'Achievement unlocked!',
      achievement.name,
      { achievementId: achievement.id, achievementCode: achievement.code },
    );
  }

  async onModuleInit() {
    for (const a of [...DEFAULT_ACHIEVEMENTS, ...CHALLENGE_ACHIEVEMENTS, ...PLATFORM_ACHIEVEMENTS]) {
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

      await this.unlockAndNotify(userId, achievement);
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

      await this.unlockAndNotify(userId, achievement);
    }
  }

  // Called after: a post is created, a follow happens (for the followed
  // user), a live stream starts, a gift is sent (for both sender and
  // recipient), a chat message is sent, and a relationship request is
  // accepted (for both partners). All seven stats are cheap independent
  // counts, so evaluating them together in one pass — rather than one
  // bespoke method per trigger, unlike the cards/challenges evaluators
  // above — keeps six call sites from needing six near-identical methods.
  async evaluatePlatformAchievementsForUser(userId: string) {
    const platformCriteriaTypes = new Set([
      'postsCreated',
      'followersCount',
      'liveStreamsHosted',
      'giftsSent',
      'giftsReceived',
      'messagesSent',
      'relationshipActive',
    ]);
    const achievements = (await this.prisma.achievement.findMany()).filter((a) =>
      platformCriteriaTypes.has((a.criteria as unknown as AchievementCriteria).type),
    );
    if (achievements.length === 0) return;

    const already = new Set(
      (await this.prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })).map(
        (u) => u.achievementId,
      ),
    );

    const [postsCreated, followersCount, liveStreamsHosted, giftsSent, giftsReceived, messagesSent, activeRelationships] =
      await Promise.all([
        this.prisma.post.count({ where: { authorId: userId } }),
        this.prisma.follow.count({ where: { followingId: userId } }),
        this.prisma.liveRoom.count({ where: { hostId: userId } }),
        this.prisma.gift.count({ where: { senderId: userId } }),
        this.prisma.gift.count({ where: { recipientId: userId } }),
        this.prisma.message.count({ where: { senderId: userId } }),
        this.prisma.relationship.count({ where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] } }),
      ]);

    const valueFor: Record<string, number> = {
      postsCreated,
      followersCount,
      liveStreamsHosted,
      giftsSent,
      giftsReceived,
      messagesSent,
      relationshipActive: activeRelationships,
    };

    for (const achievement of achievements) {
      if (already.has(achievement.id)) continue;
      const criteria = achievement.criteria as unknown as AchievementCriteria;
      const value = valueFor[criteria.type];
      if (value === undefined || value < criteria.threshold) continue;

      await this.unlockAndNotify(userId, achievement);
    }
  }
}
