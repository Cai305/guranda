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
}
