// One-off backfill: give every pre-existing User a matching, already-active
// Username row, seeded with their CURRENT live-computed reputation/subscribers
// as both the frozen score and the activation baseline. That makes this a
// no-op for every existing profile's displayed numbers (displayed ==
// baseline + (live - baseline) == live, at the instant of backfill) — no
// existing user's shown reputation jumps because of this migration.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mirrors UsersService.computeLiveActivity() — duplicated here rather than
// imported since this script runs standalone via ts-node, outside Nest's DI.
async function computeLiveActivity(userId: string) {
  const seatMatch = JSON.stringify([{ userId }]);
  const [, likesReceived, storyLikesReceived, videoLikes, videoViewsAgg, chessGames, ludoRows, wordBattleRows, poolRows, liveStreamsHosted, giftsReceived] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.postLike.count({ where: { post: { authorId: userId } } }),
    prisma.storyLike.count({ where: { story: { userId } } }),
    prisma.videoLike.count({ where: { video: { creatorId: userId } } }),
    prisma.video.aggregate({ where: { creatorId: userId }, _sum: { views: true } }),
    prisma.chessGame.count({ where: { OR: [{ whiteId: userId }, { blackId: userId }], status: { not: 'active' } } }),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::int AS count FROM "LudoGame" WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::int AS count FROM "WordBattleGame" WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::int AS count FROM "PoolGame" WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'`,
    prisma.liveRoom.count({ where: { hostId: userId } }),
    prisma.gift.count({ where: { recipientId: userId } }),
  ]);
  const videoViews = videoViewsAgg._sum.views ?? 0;
  const gamesCount = chessGames + Number(ludoRows[0]?.count ?? 0) + Number(wordBattleRows[0]?.count ?? 0) + Number(poolRows[0]?.count ?? 0);
  const subscribers = Math.round(storyLikesReceived * 4 + videoLikes * 5 + videoViews * 0.2 + gamesCount * 3 + giftsReceived * 6 + 12);
  const reputation = Math.round(subscribers * 3 + likesReceived * 2 + videoViews * 0.1 + gamesCount * 8 + liveStreamsHosted * 15);
  return { subscribers, reputation };
}

function levelForSubscribers(subscribers: number): string {
  return subscribers >= 100000 ? 'Mega Influencer' :
    subscribers >= 10000 ? 'Macro' :
    subscribers >= 1000 ? 'Midtier' :
    subscribers >= 100 ? 'Micro' : 'Nano';
}

async function main() {
  const users = await prisma.user.findMany({ where: { activeUsernameId: null }, select: { id: true, username: true } });
  console.log(`Backfilling ${users.length} user(s) with no active Username yet...`);

  let done = 0;
  for (const user of users) {
    const label = user.username.trim().toLowerCase();
    const live = await computeLiveActivity(user.id);
    const level = levelForSubscribers(live.subscribers);

    // A prior user might already own a Username row with this exact label
    // (re-running after a partial failure) — reuse it instead of colliding
    // on the @unique label constraint.
    const existing = await prisma.username.findUnique({ where: { label } });
    const usernameRow = existing ?? await prisma.username.create({
      data: {
        label,
        ownerId: user.id,
        isActive: true,
        acquiredVia: 'FREE_CLAIM',
        reputationScore: live.reputation,
        subscribersScore: live.subscribers,
        level,
        activationLiveReputationBaseline: live.reputation,
        activationLiveSubscribersBaseline: live.subscribers,
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { activeUsernameId: usernameRow.id } });
    done++;
  }
  console.log(`Backfill complete. ${done} user(s) now have an active Username.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
