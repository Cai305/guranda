import { PrismaService } from '../prisma.service';

// Shared between UsersService (live activity formula), the usernames
// module (reputation-snapshot mechanic), and the profile module (pillar
// cards) — kept standalone so none of them need to import each other just
// for this lookup table / formula.
const LEVEL_THRESHOLDS: { level: string; min: number }[] = [
  { level: 'Nano', min: 0 },
  { level: 'Micro', min: 100 },
  { level: 'Midtier', min: 1000 },
  { level: 'Macro', min: 10000 },
  { level: 'Mega Influencer', min: 100000 },
];

export function levelForSubscribers(subscribers: number): string {
  let current = LEVEL_THRESHOLDS[0].level;
  for (const t of LEVEL_THRESHOLDS) {
    if (subscribers >= t.min) current = t.level;
  }
  return current;
}

// The full league ladder, in order — used by the Rank pillar's visual
// progress bar so the UI can render "how far through the entire ladder"
// rather than just the current-to-next-level fraction.
export function levelLadder(): { level: string; min: number }[] {
  return LEVEL_THRESHOLDS.map((t) => ({ ...t }));
}

// For the Rank pillar's "240 points to Micro" narration — null once at the
// top tier (Mega Influencer has no next level).
export function nextLevelThreshold(
  subscribers: number,
): { nextLevel: string; subscribersNeeded: number } | null {
  const next = LEVEL_THRESHOLDS.find((t) => t.min > subscribers);
  if (!next) return null;
  return { nextLevel: next.level, subscribersNeeded: next.min - subscribers };
}

/**
 * The account's real lifetime activity, keyed by userId forever — this
 * formula never changes and never gets re-keyed by username. Moved out of
 * UsersService into this standalone util so the profile module can reuse it
 * without a circular module import (ProfileModule would need UsersModule
 * for this, and UsersModule needs ProfileModule for badge-minting hooks).
 */
export async function computeLiveActivity(prisma: PrismaService, userId: string) {
  const seatMatch = JSON.stringify([{ userId }]);

  const [
    postsCount,
    likesReceived,
    storyLikesReceived,
    videoLikes,
    videoViewsAgg,
    chessGames,
    ludoRows,
    wordBattleRows,
    poolRows,
    liveStreamsHosted,
    giftsReceived,
  ] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.postLike.count({ where: { post: { authorId: userId } } }),
    prisma.storyLike.count({ where: { story: { userId } } }),
    prisma.videoLike.count({ where: { video: { creatorId: userId } } }),
    prisma.video.aggregate({
      where: { creatorId: userId },
      _sum: { views: true },
    }),
    prisma.chessGame.count({
      where: {
        OR: [{ whiteId: userId }, { blackId: userId }],
        status: { not: 'active' },
      },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int AS count FROM "LudoGame"
      WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int AS count FROM "WordBattleGame"
      WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int AS count FROM "PoolGame"
      WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
    `,
    prisma.liveRoom.count({ where: { hostId: userId } }),
    prisma.gift.count({ where: { recipientId: userId } }),
  ]);

  const videoViews = videoViewsAgg._sum.views ?? 0;
  const gamesCount =
    chessGames +
    Number(ludoRows[0]?.count ?? 0) +
    Number(wordBattleRows[0]?.count ?? 0) +
    Number(poolRows[0]?.count ?? 0);

  const subscribers = Math.round(
    storyLikesReceived * 4 +
      videoLikes * 5 +
      videoViews * 0.2 +
      gamesCount * 3 +
      giftsReceived * 6 +
      12,
  );
  const reputation = Math.round(
    subscribers * 3 +
      likesReceived * 2 +
      videoViews * 0.1 +
      gamesCount * 8 +
      liveStreamsHosted * 15,
  );

  return {
    postsCount,
    likesReceived,
    gamesCount,
    liveStreamsHosted,
    giftsReceived,
    subscribers,
    reputation,
  };
}

// The displayed reputation/subscribers/level — active username's frozen
// baseline + however much live activity has accrued since it was activated.
// Also moved out of UsersService.getProfile() so ProfileService can reuse it
// without importing UsersService (see computeLiveActivity's comment above).
export async function getDisplayedReputation(prisma: PrismaService, userId: string) {
  const live = await computeLiveActivity(prisma, userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeUsernameId: true },
  });
  const active = user?.activeUsernameId
    ? await prisma.username.findUnique({ where: { id: user.activeUsernameId } })
    : null;

  const subscribers = active
    ? active.subscribersScore + (live.subscribers - active.activationLiveSubscribersBaseline)
    : live.subscribers;
  const reputation = active
    ? active.reputationScore + (live.reputation - active.activationLiveReputationBaseline)
    : live.reputation;

  return { live, subscribers, reputation, level: levelForSubscribers(subscribers) };
}
