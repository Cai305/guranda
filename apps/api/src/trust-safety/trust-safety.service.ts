import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

// A first, deliberately simple watcher: large wallet transfers. This is the
// seed of §21's Trust & Safety Engine — a proactive layer that consumes the
// Event Bus (§25) rather than a synchronous check inside sendMasheleni, so a
// slow/broken watcher can never block a real transfer. Every flag lands in
// TrustSafetyFlag as OPEN — nothing here blocks, reverses, or auto-hides
// anything; that's a human-reviewed admin decision (see the admin console's
// new /admin/trust-safety page), same as every other moderation action in
// this codebase.
const LARGE_TRANSFER_THRESHOLD_MSH = 500;

@Injectable()
export class TrustSafetyService {
  private readonly logger = new Logger(TrustSafetyService.name);

  constructor(private prisma: PrismaService) {}

  // Polls the outbox rather than subscribing synchronously — matches the
  // "Postgres-backed outbox, polled" plan for the Event Bus before it
  // graduates to a real broker at higher scale (§29).
  @Cron('*/1 * * * *')
  async scanWalletTransfers() {
    const events = await this.prisma.event.findMany({
      where: { type: 'wallet.transfer.completed', processedAt: null },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
    if (!events.length) return;

    for (const event of events) {
      const payload = event.payload as { amount?: number };
      if ((payload.amount ?? 0) >= LARGE_TRANSFER_THRESHOLD_MSH) {
        await this.prisma.trustSafetyFlag.create({
          data: {
            eventType: event.type,
            aggregateId: event.aggregateId,
            reason: `Transfer of ${payload.amount} MSH exceeds the ${LARGE_TRANSFER_THRESHOLD_MSH} MSH review threshold`,
            severity: payload.amount! >= LARGE_TRANSFER_THRESHOLD_MSH * 4 ? 'HIGH' : 'MEDIUM',
          },
        });
      }
    }

    await this.prisma.event.updateMany({
      where: { id: { in: events.map((e) => e.id) } },
      data: { processedAt: new Date() },
    });
    this.logger.log(`Trust & Safety scanned ${events.length} wallet transfer event(s)`);
  }

  async listFlags(status?: string) {
    return this.prisma.trustSafetyFlag.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async review(id: string, status: 'REVIEWED' | 'DISMISSED') {
    return this.prisma.trustSafetyFlag.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
    });
  }
}
