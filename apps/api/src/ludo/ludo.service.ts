import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  LUDO_MODES,
  LudoMode,
  createInitialTokens,
  getActiveSeats,
  getLegalMoves,
  applyMove,
  getTeamOf,
  isTeamFinished,
  nextActiveSeat,
  selectAIMove,
} from '@mxit2/types';

interface QueueEntry {
  userId: string;
  displayName: string;
  socketId: string;
}

interface SeatInput {
  userId: string | null;
  displayName: string;
  isAI: boolean;
}

@Injectable()
export class LudoService {
  private queues: Map<LudoMode, QueueEntry[]> = new Map();

  constructor(private prisma: PrismaService) {}

  // ---- Matchmaking (real human opponents) ----

  joinQueue(
    mode: LudoMode,
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

    const playersNeeded = getActiveSeats(LUDO_MODES[mode]).length;
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

  // `players` fills the mode's active seats in order; any remaining
  // board seats (e.g. the two unused corners in 1v1) stay empty and
  // never receive a turn.
  async createGame(mode: LudoMode, players: SeatInput[], createdById: string) {
    const config = LUDO_MODES[mode];
    const active = getActiveSeats(config);
    const seats = Array.from({ length: config.corners }, (_, seatIndex) => {
      const playerIdx = active.indexOf(seatIndex);
      if (playerIdx === -1 || !players[playerIdx]) {
        return { seatIndex, userId: null, isAI: false, displayName: '' };
      }
      return { seatIndex, ...players[playerIdx] };
    });
    const tokens = createInitialTokens(config.corners);

    return this.prisma.ludoGame.create({
      data: {
        mode,
        seats: seats as any,
        tokens: tokens as any,
        currentSeat: active[0],
        status: 'active',
        createdById,
      },
    });
  }

  async startAIGame(mode: LudoMode, userId: string, displayName: string) {
    const playersNeeded = getActiveSeats(LUDO_MODES[mode]).length;
    const players: SeatInput[] = Array.from(
      { length: playersNeeded },
      (_, i) =>
        i === 0
          ? { userId, displayName, isAI: false }
          : { userId: null, displayName: `Bot ${i}`, isAI: true },
    );
    return this.createGame(mode, players, userId);
  }

  async getGame(gameId: string) {
    return this.prisma.ludoGame.findUnique({ where: { id: gameId } });
  }

  async rollDice(gameId: string, userId: string) {
    const game = await this.prisma.ludoGame.findUnique({
      where: { id: gameId },
    });
    if (!game || game.status !== 'active') return null;
    const seat = (game.seats as any[])[game.currentSeat];
    if (seat.isAI || seat.userId !== userId) return null;
    if (game.diceValue !== null) return null;
    return this.applyRoll(gameId);
  }

  async moveToken(gameId: string, userId: string, tokenIndex: number) {
    const game = await this.prisma.ludoGame.findUnique({
      where: { id: gameId },
    });
    if (!game || game.status !== 'active') return null;
    const seat = (game.seats as any[])[game.currentSeat];
    if (seat.isAI || seat.userId !== userId) return null;
    if (game.diceValue === null) return null;
    return this.applyMoveInternal(gameId, tokenIndex);
  }

  // Drives one full "turn" for an AI seat: roll, then (if a move is
  // possible) pick and apply one via the heuristic bot. Used only by
  // the gateway's AI loop — never reachable from a client socket event.
  async playAITurn(gameId: string) {
    const game = await this.prisma.ludoGame.findUnique({
      where: { id: gameId },
    });
    if (!game || game.status !== 'active') return null;
    const seat = (game.seats as any[])[game.currentSeat];
    if (!seat.isAI) return null;

    const rolled = await this.applyRoll(gameId);
    if (!rolled || rolled.status !== 'active' || rolled.diceValue === null) {
      return rolled;
    }

    const mode = LUDO_MODES[rolled.mode as LudoMode];
    const tokens = rolled.tokens as unknown as number[][];
    const legalMoves = getLegalMoves(
      tokens,
      rolled.currentSeat,
      mode.corners,
      rolled.diceValue,
      mode.teams,
    );
    const chosen = selectAIMove(legalMoves, tokens[rolled.currentSeat]);
    if (!chosen) return rolled;

    return this.applyMoveInternal(gameId, chosen.tokenIndex);
  }

  private async applyRoll(gameId: string) {
    const game = await this.prisma.ludoGame.findUnique({
      where: { id: gameId },
    });
    if (!game) return null;
    const mode = LUDO_MODES[game.mode as LudoMode];
    const tokens = game.tokens as unknown as number[][];
    const activeSeats = getActiveSeats(mode);
    const diceValue = 1 + Math.floor(Math.random() * 6);
    const consecutiveSixes = diceValue === 6 ? game.consecutiveSixes + 1 : 0;

    if (consecutiveSixes >= 3) {
      const nextSeat = nextActiveSeat(
        game.currentSeat,
        mode.corners,
        tokens,
        activeSeats,
      );
      return this.prisma.ludoGame.update({
        where: { id: gameId },
        data: { diceValue: null, consecutiveSixes: 0, currentSeat: nextSeat },
      });
    }

    const legalMoves = getLegalMoves(
      tokens,
      game.currentSeat,
      mode.corners,
      diceValue,
      mode.teams,
    );
    if (legalMoves.length === 0) {
      const nextSeat = nextActiveSeat(
        game.currentSeat,
        mode.corners,
        tokens,
        activeSeats,
      );
      return this.prisma.ludoGame.update({
        where: { id: gameId },
        data: { diceValue: null, consecutiveSixes: 0, currentSeat: nextSeat },
      });
    }

    return this.prisma.ludoGame.update({
      where: { id: gameId },
      data: { diceValue, consecutiveSixes },
    });
  }

  private async applyMoveInternal(gameId: string, tokenIndex: number) {
    const game = await this.prisma.ludoGame.findUnique({
      where: { id: gameId },
    });
    if (!game || game.diceValue === null) return null;
    const mode = LUDO_MODES[game.mode as LudoMode];
    const tokens = game.tokens as unknown as number[][];
    const legalMoves = getLegalMoves(
      tokens,
      game.currentSeat,
      mode.corners,
      game.diceValue,
      mode.teams,
    );
    const move = legalMoves.find((m) => m.tokenIndex === tokenIndex);
    if (!move) return null;

    const newTokens = applyMove(tokens, game.currentSeat, move);
    const myTeam = getTeamOf(game.currentSeat, mode.teams);

    if (isTeamFinished(newTokens, mode.teams[myTeam], mode.corners)) {
      return this.prisma.ludoGame.update({
        where: { id: gameId },
        data: {
          tokens: newTokens as any,
          diceValue: null,
          status: 'finished',
          winnerTeam: myTeam,
        },
      });
    }

    const diceWasSix = game.diceValue === 6;
    const extraTurn =
      diceWasSix || move.capturedTargets.length > 0 || move.entersHome;
    const nextSeat = extraTurn
      ? game.currentSeat
      : nextActiveSeat(
          game.currentSeat,
          mode.corners,
          newTokens,
          getActiveSeats(mode),
        );

    return this.prisma.ludoGame.update({
      where: { id: gameId },
      data: {
        tokens: newTokens as any,
        diceValue: null,
        currentSeat: nextSeat,
        consecutiveSixes: extraTurn ? game.consecutiveSixes : 0,
      },
    });
  }
}
