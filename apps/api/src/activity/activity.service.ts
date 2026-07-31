import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Cross-game activity summary for the Profile Dashboard. Ludo and Word
// Battle both store their seat list as a Json blob rather than a proper
// join table, so counting "games this user played" needs a JSONB
// containment query (`seats @> '[{"userId":"..."}]'`) rather than a
// normal Prisma where-clause.
@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async gamesSummary(userId: string) {
    const seatMatch = JSON.stringify([{ userId }]);

    const [ludoRows, wordBattleRows] = await Promise.all([
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::int AS count FROM "LudoGame"
        WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::int AS count FROM "WordBattleGame"
        WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
      `,
    ]);

    const ludo = Number(ludoRows[0]?.count ?? 0);
    const wordBattle = Number(wordBattleRows[0]?.count ?? 0);

    return { totalPlayed: ludo + wordBattle, byGame: { ludo, wordBattle } };
  }
}
