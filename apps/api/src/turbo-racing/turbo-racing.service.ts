import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  TurboRacingSeatDto,
  FINISH_DISTANCE,
  UpgradeStat,
  MAX_UPGRADE_LEVEL,
  costForLevel,
  PLACEMENT_BONUS,
  CAR_COLORS,
  DEFAULT_CAR_COLOR,
} from '@mxit2/types';

interface QueueEntry {
  userId: string;
  displayName: string;
  socketId: string;
}

@Injectable()
export class TurboRacingService {
  private queue: QueueEntry[] = [];

  constructor(private prisma: PrismaService) {}

  // ---- Matchmaking (head-to-head, exactly 2 real players) ----

  joinQueue(userId: string, displayName: string, socketId: string) {
    if (!this.queue.find((p) => p.userId === userId)) {
      this.queue.push({ userId, displayName, socketId });
    }
    if (this.queue.length >= 2) {
      return { matchFound: true, players: this.queue.splice(0, 2) };
    }
    return { matchFound: false, players: [] as QueueEntry[] };
  }

  removeFromQueue(socketId: string) {
    const idx = this.queue.findIndex((p) => p.socketId === socketId);
    if (idx !== -1) this.queue.splice(idx, 1);
  }

  // ---- Race lifecycle ----

  async createRace(
    players: { userId: string; displayName: string }[],
    createdById: string,
  ) {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const upgradesByUser = await this.prisma.turboCarUpgrades.findMany({
      where: { userId: { in: players.map((p) => p.userId) } },
    });
    const colorOf = (userId: string) =>
      upgradesByUser.find((u) => u.userId === userId)?.color ??
      DEFAULT_CAR_COLOR;

    const seats: TurboRacingSeatDto[] = players.map((p, i) => ({
      seatIndex: i,
      userId: p.userId,
      displayName: p.displayName,
      color: colorOf(p.userId),
      distance: 0,
      lane: 1,
      crashed: false,
      coins: 0,
      rank: null,
      finishedAt: null,
    }));

    return this.prisma.turboRacingRace.create({
      data: {
        seed,
        finishDistance: FINISH_DISTANCE,
        seats: seats as any,
        status: 'active',
        createdById,
      },
    });
  }

  async getRace(raceId: string) {
    return this.prisma.turboRacingRace.findUnique({ where: { id: raceId } });
  }

  // Racers report their own client-simulated progress (same trust model as
  // Pool's shot relay — no continuous physics for the server to re-verify).
  // We only reject updates from users who aren't seated in this race.
  async reportProgress(
    raceId: string,
    userId: string,
    data: { distance: number; lane: number; crashed: boolean; coins: number },
  ) {
    const race = await this.prisma.turboRacingRace.findUnique({
      where: { id: raceId },
    });
    if (!race || race.status !== 'active') return null;

    const seats = race.seats as unknown as TurboRacingSeatDto[];
    const seat = seats.find((s) => s.userId === userId);
    if (!seat) return null;

    seat.distance = Math.max(seat.distance, data.distance);
    seat.lane = data.lane;
    seat.crashed = data.crashed;
    seat.coins = Math.max(seat.coins, data.coins);

    if (seat.rank === null && seat.distance >= race.finishDistance) {
      const takenRanks = seats.filter((s) => s.rank !== null).length;
      seat.rank = takenRanks + 1;
      seat.finishedAt = new Date().toISOString();
    }

    const allFinished = seats.every((s) => s.rank !== null);
    const updated = await this.prisma.turboRacingRace.update({
      where: { id: raceId },
      data: {
        seats: seats as any,
        status: allFinished ? 'finished' : 'active',
      },
    });

    if (allFinished) {
      await this.payoutResults(seats);
    }

    return updated;
  }

  private async payoutResults(seats: TurboRacingSeatDto[]) {
    for (const seat of seats) {
      const bonus =
        seat.rank !== null ? (PLACEMENT_BONUS[seat.rank - 1] ?? 0) : 0;
      const reward = seat.coins + bonus;
      if (reward <= 0) continue;
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: seat.userId },
      });
      if (!wallet) continue;
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balanceMasheleni: { increment: reward } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'RECEIVE',
            status: 'SUCCESS',
            amount: reward,
          },
        }),
      ]);
    }
  }

  // ---- Car upgrades (bought with MSH) ----

  async getUpgrades(userId: string) {
    const existing = await this.prisma.turboCarUpgrades.findUnique({
      where: { userId },
    });
    return (
      existing ?? {
        userId,
        speedLevel: 0,
        accelLevel: 0,
        handlingLevel: 0,
        color: DEFAULT_CAR_COLOR,
      }
    );
  }

  // Livery paint is purely cosmetic — free to change any time.
  async setColor(userId: string, color: string) {
    if (!CAR_COLORS.includes(color)) {
      throw new BadRequestException('Invalid car color');
    }
    return this.prisma.turboCarUpgrades.upsert({
      where: { userId },
      create: { userId, color },
      update: { color },
    });
  }

  async buyUpgrade(userId: string, stat: UpgradeStat) {
    const upgrades = await this.prisma.turboCarUpgrades.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const field =
      stat === 'speed'
        ? 'speedLevel'
        : stat === 'acceleration'
          ? 'accelLevel'
          : 'handlingLevel';
    const currentLevel = upgrades[field];
    const nextLevel = currentLevel + 1;
    if (nextLevel > MAX_UPGRADE_LEVEL) {
      throw new BadRequestException('Already at max level');
    }
    const cost = costForLevel(nextLevel);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    if (Number(wallet.balanceMasheleni) < cost) {
      throw new BadRequestException(
        `Not enough MSH — need ${cost}, have ${wallet.balanceMasheleni}`,
      );
    }

    const [, , updated] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { decrement: cost } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYMENT',
          status: 'SUCCESS',
          amount: -cost,
        },
      }),
      this.prisma.turboCarUpgrades.update({
        where: { userId },
        data: { [field]: nextLevel },
      }),
    ]);

    return updated;
  }
}
