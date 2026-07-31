import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { rackBalls } from './rack';
import { newPoolState } from './rules';

interface QueueEntry {
  userId: string;
  displayName: string;
  socketId: string;
}

@Injectable()
export class PoolService {
  private queue: QueueEntry[] = [];

  constructor(private prisma: PrismaService) {}

  // ---- Matchmaking ----

  joinQueue(userId: string, displayName: string, socketId: string) {
    if (!this.queue.find((p) => p.userId === userId))
      this.queue.push({ userId, displayName, socketId });
    if (this.queue.length >= 2)
      return { matchFound: true, players: this.queue.splice(0, 2) };
    return { matchFound: false, players: [] as QueueEntry[] };
  }

  removeFromQueue(socketId: string) {
    const idx = this.queue.findIndex((p) => p.socketId === socketId);
    if (idx !== -1) this.queue.splice(idx, 1);
  }

  // ---- Game lifecycle ----

  async createGame(
    players: { userId: string; displayName: string }[],
    createdById: string,
    wager = 0,
  ) {
    const seats = players.map((p, i) => ({
      seatIndex: i,
      userId: p.userId,
      isAI: false,
      displayName: p.displayName,
    }));
    return this.prisma.poolGame.create({
      data: {
        seats: seats as any,
        balls: rackBalls() as any,
        state: newPoolState() as any,
        status: 'active',
        wager,
        createdById,
      },
    });
  }

  async getGame(id: string) {
    return this.prisma.poolGame.findUnique({ where: { id } });
  }

  seatOf(game: { seats: any }, userId: string): number | null {
    const seats = game.seats as any[];
    const idx = seats.findIndex((s) => s.userId === userId);
    return idx === -1 ? null : idx;
  }

  // Only the seat whose turn it currently is may submit a result — this is
  // the one integrity check needed since physics itself is trusted from
  // the client (deterministic, no hidden information to cheat with).
  async applyResult(gameId: string, userId: string, balls: any, state: any) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active') return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const currentTurn = (game.state as any).turn;
    if (currentTurn !== seatIndex) return null;

    const finished = state.winner !== null && state.winner !== undefined;
    return this.prisma.poolGame.update({
      where: { id: gameId },
      data: { balls, state, status: finished ? 'finished' : 'active' },
    });
  }
}
