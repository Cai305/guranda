import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * The seed of §22's Intelligence Engine: a single consumer of the Event Bus,
 * read-only, computed on demand rather than a separate materialized table —
 * intentionally the smallest possible version of "fan out into read models"
 * so it's real and correct today, with the aggregation table split out
 * later only once query volume actually asks for it (§29's scaling
 * roadmap principle: don't add infrastructure before the metric says to).
 */
@Injectable()
export class IntelligenceService {
  constructor(private prisma: PrismaService) {}

  async platformActivitySummary(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const events = await this.prisma.event.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });
    return {
      windowHours: hours,
      byType: events.map((e) => ({ type: e.type, count: e._count._all })),
      total: events.reduce((sum, e) => sum + e._count._all, 0),
    };
  }

  async personalActivitySummary(userId: string, hours = 24 * 7) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    // aggregateId doesn't carry userId uniformly across every event type yet
    // (wallet events use walletId, post events use postId) — this reports
    // what's directly attributable today (wallet transfers, since
    // wallet.transfer.completed's payload always carries both wallet ids)
    // and is meant to widen as more event payloads standardize on userId.
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return { windowHours: hours, transfers: 0 };
    const events = await this.prisma.event.findMany({
      where: {
        type: 'wallet.transfer.completed',
        createdAt: { gte: since },
        aggregateId: wallet.id,
      },
      select: { id: true },
    });
    return { windowHours: hours, transfers: events.length };
  }
}
