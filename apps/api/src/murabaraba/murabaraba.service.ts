import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  MURABARABA_MODES,
  MurabarabaMode,
  MurabarabaSeatDto,
  MurabarabaSeatInput,
  GameState,
  buildSeats,
  totalSeats,
  newGame,
  applyAction,
  getSeat,
  nextSeatForSide,
  Action,
} from '@mxit2/types';

interface QueueEntry {
  userId: string;
  displayName: string;
  socketId: string;
}

@Injectable()
export class MurabarabaService {
  private queues: Map<MurabarabaMode, QueueEntry[]> = new Map();

  constructor(private prisma: PrismaService) {}

  // ---- Matchmaking (real human opponents only — no AI-filled online seats) ----

  joinQueue(
    mode: MurabarabaMode,
    userId: string,
    displayName: string,
    socketId: string,
  ) {
    let list = this.queues.get(mode);
    if (!list) {
      list = [];
      this.queues.set(mode, list);
    }
    if (!list.find((p) => p.userId === userId)) {
      list.push({ userId, displayName, socketId });
    }

    const playersNeeded = totalSeats(MURABARABA_MODES[mode]);
    if (list.length >= playersNeeded) {
      return { matchFound: true, players: list.splice(0, playersNeeded) };
    }
    return { matchFound: false, players: [] as QueueEntry[] };
  }

  removeFromQueue(socketId: string) {
    for (const list of this.queues.values()) {
      const idx = list.findIndex((p) => p.socketId === socketId);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  // ---- Game lifecycle ----

  async createGame(
    mode: MurabarabaMode,
    players: MurabarabaSeatInput[],
    createdById: string,
  ) {
    const config = MURABARABA_MODES[mode];
    const seats = buildSeats(config, players);
    const state = newGame();

    // Seed turnCursor as if the starting side's first seat had already been
    // picked via nextSeatForSide (it effectively was, below) — otherwise
    // that side's seat-0 teammate would get picked again unrotated the
    // next time this side comes up, before ever reaching other teammates.
    const turnCursor: [number, number] = [0, 0];
    const picked = nextSeatForSide(seats, state.turn, 0);
    turnCursor[state.turn] = picked.nextCursor;

    return this.prisma.murabarabaGame.create({
      data: {
        mode,
        seats: seats as any,
        state: state as any,
        activeSeat: picked.seatIndex,
        turnCursor: turnCursor as any,
        status: 'active',
        createdById,
      },
    });
  }

  async getGame(gameId: string) {
    return this.prisma.murabarabaGame.findUnique({ where: { id: gameId } });
  }

  async place(gameId: string, userId: string, to: number) {
    return this.applyValidated(gameId, userId, { type: 'place', to });
  }

  async move(gameId: string, userId: string, from: number, to: number) {
    return this.applyValidated(gameId, userId, { type: 'move', from, to });
  }

  async shoot(gameId: string, userId: string, at: number) {
    return this.applyValidated(gameId, userId, { type: 'shoot', at });
  }

  private async applyValidated(gameId: string, userId: string, action: Action) {
    const game = await this.prisma.murabarabaGame.findUnique({
      where: { id: gameId },
    });
    if (!game || game.status !== 'active') return null;

    const seats = game.seats as unknown as MurabarabaSeatDto[];
    const activeSeat = getSeat(seats, game.activeSeat);
    if (!activeSeat || activeSeat.userId !== userId) return null;

    const state = game.state as unknown as GameState;
    const nextState = applyAction(state, action);
    if (nextState === state) return null; // illegal move — engine returned the same state unchanged

    // Side unchanged (e.g. a mill just made pendingShot=true) → the
    // same seat keeps acting. Side changed → rotate to the next
    // teammate on the new side (round-robin via turnCursor).
    let nextActiveSeat = game.activeSeat;
    let turnCursor = game.turnCursor as unknown as [number, number];
    if (
      nextState.turn !== state.turn &&
      nextState.winner === null &&
      !nextState.draw
    ) {
      const cursor = turnCursor[nextState.turn];
      const picked = nextSeatForSide(seats, nextState.turn, cursor);
      nextActiveSeat = picked.seatIndex;
      turnCursor = [...turnCursor] as [number, number];
      turnCursor[nextState.turn] = picked.nextCursor;
    }

    const finished = nextState.winner !== null || nextState.draw;
    return this.prisma.murabarabaGame.update({
      where: { id: gameId },
      data: {
        state: nextState as any,
        activeSeat: nextActiveSeat,
        turnCursor: turnCursor as any,
        status: finished ? 'finished' : 'active',
        winnerSide: nextState.winner,
      },
    });
  }
}
