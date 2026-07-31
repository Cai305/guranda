import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

interface ChallengeCriteria {
  type: 'playGames' | 'winGames' | 'sweep';
  target: number;
}

const TEMPLATES: { mode: 'FIVE_CARDS' | 'CASSINO' | null; description: string; criteria: ChallengeCriteria; rewardMasheleni: number }[] = [
  { mode: null, description: 'Play 3 card games today', criteria: { type: 'playGames', target: 3 }, rewardMasheleni: 5 },
  { mode: null, description: 'Win 2 card games today', criteria: { type: 'winGames', target: 2 }, rewardMasheleni: 10 },
  { mode: 'CASSINO', description: 'Sweep the table once today', criteria: { type: 'sweep', target: 1 }, rewardMasheleni: 8 },
];

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class DailyChallengesService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateToday() {
    return this.ensureTodayGenerated();
  }

  /** Idempotent — safe to call lazily too, so today's challenges exist even if the app just booted mid-day. */
  async ensureTodayGenerated() {
    const activeDate = todayDateOnly();
    for (const t of TEMPLATES) {
      await this.prisma.dailyChallenge.upsert({
        where: { mode_activeDate_description: { mode: t.mode as any, activeDate, description: t.description } },
        create: {
          mode: t.mode as any,
          description: t.description,
          criteria: t.criteria as any,
          rewardMasheleni: t.rewardMasheleni,
          activeDate,
        },
        update: {},
      });
    }
    return this.prisma.dailyChallenge.findMany({ where: { activeDate } });
  }

  async listToday(userId: string) {
    const challenges = await this.ensureTodayGenerated();
    const progress = await this.prisma.userChallengeProgress.findMany({
      where: { userId, challengeId: { in: challenges.map((c) => c.id) } },
    });
    const byId = new Map(progress.map((p) => [p.challengeId, p]));
    return challenges.map((c) => ({ challenge: c, progress: byId.get(c.id) ?? null }));
  }

  /** Called after every finished card game with what happened, to advance any matching today's challenges. */
  async recordEvent(
    userId: string,
    event: { mode: 'FIVE_CARDS' | 'CASSINO'; won: boolean; sweeps: number },
  ) {
    const activeDate = todayDateOnly();
    const challenges = await this.prisma.dailyChallenge.findMany({
      where: { activeDate, OR: [{ mode: null }, { mode: event.mode as any }] },
    });

    for (const challenge of challenges) {
      const criteria = challenge.criteria as unknown as ChallengeCriteria;
      let delta = 0;
      if (criteria.type === 'playGames') delta = 1;
      else if (criteria.type === 'winGames') delta = event.won ? 1 : 0;
      else if (criteria.type === 'sweep') delta = event.sweeps;
      if (delta <= 0) continue;

      const existing = await this.prisma.userChallengeProgress.findUnique({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
      });
      const newProgress = (existing?.progress ?? 0) + delta;
      const completed = newProgress >= criteria.target;
      await this.prisma.userChallengeProgress.upsert({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
        create: { userId, challengeId: challenge.id, progress: newProgress, completed },
        update: { progress: newProgress, completed },
      });
    }
  }

  async claimReward(userId: string, challengeId: string) {
    const progress = await this.prisma.userChallengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      include: { challenge: true },
    });
    if (!progress || !progress.completed) throw new BadRequestException('Challenge not completed yet');
    if (progress.claimedAt) throw new BadRequestException('Reward already claimed');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { increment: progress.challenge.rewardMasheleni } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'RECEIVE',
          status: 'SUCCESS',
          amount: progress.challenge.rewardMasheleni,
        },
      }),
      this.prisma.userChallengeProgress.update({
        where: { userId_challengeId: { userId, challengeId } },
        data: { claimedAt: new Date() },
      }),
    ]);
    return { rewarded: progress.challenge.rewardMasheleni };
  }
}
