import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async topByMode(mode: 'FIVE_CARDS' | 'CASSINO', limit = 50) {
    return this.prisma.cardGameStats.findMany({
      where: { mode },
      orderBy: [{ rating: 'desc' }, { wins: 'desc' }],
      take: limit,
      include: { user: { select: { id: true, username: true, profile: true } } },
    });
  }

  async myRank(userId: string, mode: 'FIVE_CARDS' | 'CASSINO') {
    const mine = await this.prisma.cardGameStats.findUnique({ where: { userId_mode: { userId, mode } } });
    if (!mine) return null;
    const ahead = await this.prisma.cardGameStats.count({ where: { mode, rating: { gt: mine.rating } } });
    return { stats: mine, rank: ahead + 1 };
  }

  // ── Challenges XP leaderboard — global (UserProfile.xp) or per-category
  // (ChallengeCategoryStat.xp) — live-computed rank, same pattern as
  // myRank() above.
  async topByChallengeXp(category?: string, limit = 50) {
    if (category) {
      return this.prisma.challengeCategoryStat.findMany({
        where: { category: category as any },
        orderBy: { xp: 'desc' },
        take: limit,
        include: { user: { select: { id: true, username: true, profile: true } } },
      });
    }
    return this.prisma.userProfile.findMany({
      where: { xp: { gt: 0 } },
      orderBy: { xp: 'desc' },
      take: limit,
      include: { user: { select: { id: true, username: true } } },
    });
  }

  async myChallengeRank(userId: string, category?: string) {
    if (category) {
      const mine = await this.prisma.challengeCategoryStat.findUnique({
        where: { userId_category: { userId, category: category as any } },
      });
      if (!mine) return null;
      const ahead = await this.prisma.challengeCategoryStat.count({
        where: { category: category as any, xp: { gt: mine.xp } },
      });
      return { stats: mine, rank: ahead + 1 };
    }
    const mine = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!mine) return null;
    const ahead = await this.prisma.userProfile.count({ where: { xp: { gt: mine.xp } } });
    return { stats: mine, rank: ahead + 1 };
  }
}
