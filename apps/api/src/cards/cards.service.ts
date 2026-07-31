import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  Card,
  FiveCardsState,
  FiveCardsDifficulty,
  newFiveCardsGame,
  drawFromDeck,
  takeDiscard,
  discard as discardFiveCards,
  sanitizeFiveCardsStateForSeat,
  sanitizeFiveCardsStateForSpectator,
  pickAIDrawAction,
  pickAIDiscard,
  CassinoState,
  CassinoMatchMode,
  CassinoDifficulty,
  CassinoMove,
  newMatch as newCassinoMatch,
  legalMoves as cassinoLegalMoves,
  capture as cassinoCapture,
  build as cassinoBuild,
  extendOrTakeOverBuild as cassinoExtendOrTakeOverBuild,
  trail as cassinoTrail,
  sanitizeCassinoStateForSeat,
  sanitizeCassinoStateForSpectator,
  pickAIMove as pickCassinoAIMove,
} from '@mxit2/types';

export type CardGameMode = 'FIVE_CARDS' | 'CASSINO';

interface QueueEntry {
  userId: string;
  displayName: string;
  socketId: string;
}

interface SeatInput {
  userId: string | null;
  displayName: string;
  isAI: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  team?: 0 | 1;
}

const AI_NAME = 'Guranda Bot';

@Injectable()
export class CardsService {
  private queues: Map<CardGameMode, QueueEntry[]> = new Map();

  constructor(private prisma: PrismaService) {}

  // ---- Matchmaking (instant queue, unchanged pattern from other games) ----

  joinQueue(mode: CardGameMode, userId: string, displayName: string, socketId: string) {
    let list = this.queues.get(mode);
    if (!list) {
      list = [];
      this.queues.set(mode, list);
    }
    if (!list.find((p) => p.userId === userId)) list.push({ userId, displayName, socketId });
    if (list.length >= 2) return { matchFound: true, players: list.splice(0, 2) };
    return { matchFound: false, players: [] as QueueEntry[] };
  }

  removeFromQueue(socketId: string) {
    for (const list of this.queues.values()) {
      const idx = list.findIndex((p) => p.socketId === socketId);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  // ---- Game lifecycle ----

  private seatsMetadata(seats: SeatInput[]) {
    return seats.map((s, seatIndex) => ({
      seatIndex,
      userId: s.userId,
      isAI: s.isAI,
      displayName: s.displayName,
      difficulty: s.difficulty,
      team: s.team,
    }));
  }

  async createFiveCardsGame(
    seats: SeatInput[],
    createdById: string,
    options: {
      jokersEnabled?: boolean;
      wager?: number;
      ranked?: boolean;
      roomId?: string;
      tournamentMatchId?: string;
    } = {},
  ) {
    const state = newFiveCardsGame(
      seats.map((s) => ({
        userId: s.userId,
        isAI: s.isAI,
        displayName: s.displayName,
        difficulty: s.difficulty,
      })),
      !!options.jokersEnabled,
    );
    return this.prisma.cardGame.create({
      data: {
        mode: 'FIVE_CARDS',
        seats: this.seatsMetadata(seats) as any,
        state: state as any,
        status: 'active',
        wager: options.wager ?? 0,
        ranked: !!options.ranked,
        roomId: options.roomId,
        tournamentMatchId: options.tournamentMatchId,
        createdById,
      },
    });
  }

  async createCassinoGame(
    seats: SeatInput[],
    createdById: string,
    options: {
      cassinoMode?: CassinoMatchMode;
      targetScore?: number;
      wager?: number;
      ranked?: boolean;
      roomId?: string;
      tournamentMatchId?: string;
    } = {},
  ) {
    const cassinoMode = options.cassinoMode ?? 'ONE_V_ONE';
    const state = newCassinoMatch(
      seats.map((s) => ({
        userId: s.userId,
        isAI: s.isAI,
        displayName: s.displayName,
        difficulty: s.difficulty as CassinoDifficulty | undefined,
        team: s.team,
      })),
      cassinoMode,
      options.targetScore ?? 11,
    );
    return this.prisma.cardGame.create({
      data: {
        mode: 'CASSINO',
        cassinoMode: cassinoMode as any,
        seats: this.seatsMetadata(seats) as any,
        state: state as any,
        status: 'active',
        wager: options.wager ?? 0,
        ranked: !!options.ranked,
        roomId: options.roomId,
        tournamentMatchId: options.tournamentMatchId,
        createdById,
      },
    });
  }

  async startAIGame(
    mode: CardGameMode,
    userId: string,
    displayName: string,
    difficulty: 'easy' | 'medium' | 'hard',
    options: {
      jokersEnabled?: boolean;
      cassinoMode?: CassinoMatchMode;
      targetScore?: number;
      wager?: number;
    } = {},
  ) {
    const seats: SeatInput[] = [
      { userId, displayName, isAI: false },
      { userId: null, displayName: AI_NAME, isAI: true, difficulty },
    ];
    if (mode === 'FIVE_CARDS') {
      return this.createFiveCardsGame(seats, userId, {
        jokersEnabled: options.jokersEnabled,
        wager: options.wager,
      });
    }
    return this.createCassinoGame(seats, userId, {
      cassinoMode: options.cassinoMode ?? 'ONE_V_ONE',
      targetScore: options.targetScore,
      wager: options.wager,
    });
  }

  async getGame(gameId: string) {
    return this.prisma.cardGame.findUnique({ where: { id: gameId } });
  }

  seatOf(game: { seats: any }, userId: string): number | null {
    const seats = game.seats as any[];
    const idx = seats.findIndex((s) => s.userId === userId);
    return idx === -1 ? null : idx;
  }

  aiSeatIndex(game: { seats: any }): number | null {
    const seats = game.seats as any[];
    const idx = seats.findIndex((s) => s.isAI);
    return idx === -1 ? null : idx;
  }

  // ---- Anti-cheat sanitization ----

  sanitizeGameForSeat(game: any, seatIndex: number) {
    const isFinished = game.status === 'finished';
    const state =
      game.mode === 'FIVE_CARDS'
        ? sanitizeFiveCardsStateForSeat(game.state as unknown as FiveCardsState, seatIndex)
        : sanitizeCassinoStateForSeat(game.state as unknown as CassinoState, seatIndex);
    return { ...game, state: isFinished ? game.state : state };
  }

  sanitizeGameForSpectator(game: any) {
    const isFinished = game.status === 'finished';
    const state =
      game.mode === 'FIVE_CARDS'
        ? sanitizeFiveCardsStateForSpectator(game.state as unknown as FiveCardsState)
        : sanitizeCassinoStateForSpectator(game.state as unknown as CassinoState);
    return { ...game, state: isFinished ? game.state : state };
  }

  // ---- Move persistence (match history + replay) ----

  private async logMove(gameId: string, seatIndex: number, action: string, payload: any, stateSnapshot: any) {
    await this.prisma.cardGameMove.create({
      data: { gameId, seatIndex, action, payload: payload as any, stateSnapshot: stateSnapshot as any },
    });
  }

  // ---- Finish handling: stats. Achievements/challenges/tournament hooks
  // are wired in from their own modules once built (see cards.module.ts). ----

  onGameFinished: (game: any) => Promise<void> = async () => {};

  private async finalizeIfDone(game: any): Promise<any> {
    if (game.status !== 'finished') return game;
    await this.recordStats(game);
    await this.onGameFinished(game);
    return game;
  }

  private async recordStats(game: any) {
    const seats = game.seats as any[];
    const state = game.state;
    const winnerSeat: number | null = game.winnerSeat ?? state.winnerSeat ?? null;
    const winnerTeam: number | null = game.winnerTeam ?? state.winnerTeam ?? null;
    const startedAt = new Date(game.createdAt).getTime();
    const fastestWinMs = Date.now() - startedAt;

    for (const seat of seats) {
      if (!seat.userId) continue; // AI seats have no stats row
      const isWinner =
        winnerSeat !== null
          ? seat.seatIndex === winnerSeat
          : winnerTeam !== null
            ? seat.team === winnerTeam
            : false;
      const sweeps = game.mode === 'CASSINO' ? (state.seats?.[seat.seatIndex]?.sweeps ?? 0) : 0;

      await this.prisma.cardGameStats.upsert({
        where: { userId_mode: { userId: seat.userId, mode: game.mode } },
        create: {
          userId: seat.userId,
          mode: game.mode,
          wins: isWinner ? 1 : 0,
          losses: isWinner ? 0 : 1,
          gamesPlayed: 1,
          fastestWinMs: isWinner ? fastestWinMs : null,
          sweeps,
          rating: 1200 + (isWinner ? 8 : -8),
        },
        update: {
          wins: { increment: isWinner ? 1 : 0 },
          losses: { increment: isWinner ? 0 : 1 },
          gamesPlayed: { increment: 1 },
          sweeps: { increment: sweeps },
          rating: { increment: isWinner ? 8 : -8 },
          ...(isWinner
            ? {
                fastestWinMs: {
                  set: fastestWinMs,
                },
              }
            : {}),
        },
      });
    }
  }

  // ---- 5 Cards actions ----

  async fiveCardsDraw(gameId: string, userId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'FIVE_CARDS') return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const { state, error } = drawFromDeck(game.state as unknown as FiveCardsState, seatIndex);
    if (error) return { error };
    const updated = await this.prisma.cardGame.update({ where: { id: gameId }, data: { state: state as any } });
    await this.logMove(gameId, seatIndex, 'draw', {}, state);
    return { game: updated };
  }

  async fiveCardsTakeDiscard(gameId: string, userId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'FIVE_CARDS') return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const { state, error } = takeDiscard(game.state as unknown as FiveCardsState, seatIndex);
    if (error) return { error };
    const updated = await this.prisma.cardGame.update({ where: { id: gameId }, data: { state: state as any } });
    await this.logMove(gameId, seatIndex, 'takeDiscard', {}, state);
    return { game: updated };
  }

  async fiveCardsDiscard(gameId: string, userId: string, card: Card) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'FIVE_CARDS') return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const { state, error } = discardFiveCards(game.state as unknown as FiveCardsState, seatIndex, card);
    if (error) return { error };
    const finished = state.winnerSeat !== null;
    const updated = await this.prisma.cardGame.update({
      where: { id: gameId },
      data: { state: state as any, status: finished ? 'finished' : 'active', winnerSeat: state.winnerSeat },
    });
    await this.logMove(gameId, seatIndex, 'discard', { card }, state);
    return { game: await this.finalizeIfDone(updated) };
  }

  async playFiveCardsAITurn(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'FIVE_CARDS') return null;
    const aiSeat = this.aiSeatIndex(game);
    if (aiSeat === null) return null;
    let state = game.state as unknown as FiveCardsState;
    if (state.currentSeat !== aiSeat) return null;
    const difficulty: FiveCardsDifficulty = (game.seats as any[])[aiSeat].difficulty ?? 'medium';

    if (state.turnPhase === 'draw') {
      const action = pickAIDrawAction(state, aiSeat, difficulty);
      const result = action === 'draw' ? drawFromDeck(state, aiSeat) : takeDiscard(state, aiSeat);
      if (result.error) return null;
      state = result.state;
      await this.prisma.cardGame.update({ where: { id: gameId }, data: { state: state as any } });
      await this.logMove(gameId, aiSeat, action, {}, state);
    }

    const discardCard = pickAIDiscard(state.seats[aiSeat].hand, state.jokersEnabled);
    const result = discardFiveCards(state, aiSeat, discardCard);
    if (result.error) return null;
    const finished = result.state.winnerSeat !== null;
    const updated = await this.prisma.cardGame.update({
      where: { id: gameId },
      data: {
        state: result.state as any,
        status: finished ? 'finished' : 'active',
        winnerSeat: result.state.winnerSeat,
      },
    });
    await this.logMove(gameId, aiSeat, 'discard', { card: discardCard }, result.state);
    return { game: await this.finalizeIfDone(updated) };
  }

  // ---- Cassino actions ----

  async cassinoLegalMoves(gameId: string, userId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.mode !== 'CASSINO') return [];
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return [];
    return cassinoLegalMoves(game.state as unknown as CassinoState, seatIndex);
  }

  async cassinoPlay(
    gameId: string,
    userId: string,
    action: 'capture' | 'build' | 'trail' | 'extendBuild' | 'takeOverBuild',
    card: Card,
    targetIds: string[] = [],
    buildValue?: number,
  ) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'CASSINO') return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const state = game.state as unknown as CassinoState;

    let result: { state: CassinoState; error?: string };
    if (action === 'capture') {
      result = cassinoCapture(state, seatIndex, card, targetIds);
    } else if (action === 'build') {
      result = cassinoBuild(state, seatIndex, card, targetIds, buildValue ?? 0);
    } else if (action === 'trail') {
      result = cassinoTrail(state, seatIndex, card);
    } else {
      result = cassinoExtendOrTakeOverBuild(state, seatIndex, targetIds[0], card, buildValue ?? 0);
    }
    if (result.error) return { error: result.error };

    const finished = result.state.status === 'finished';
    const updated = await this.prisma.cardGame.update({
      where: { id: gameId },
      data: {
        state: result.state as any,
        status: finished ? 'finished' : 'active',
        winnerSeat: result.state.winnerSeat,
        winnerTeam: result.state.winnerTeam,
      },
    });
    await this.logMove(gameId, seatIndex, action, { card, targetIds, buildValue }, result.state);
    return { game: await this.finalizeIfDone(updated) };
  }

  async playCassinoAITurn(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'CASSINO') return null;
    const aiSeat = this.aiSeatIndex(game);
    if (aiSeat === null) return null;
    const state = game.state as unknown as CassinoState;
    if (state.currentSeat !== aiSeat) return null;
    const difficulty: CassinoDifficulty = (game.seats as any[])[aiSeat].difficulty ?? 'medium';
    const move: CassinoMove = pickCassinoAIMove(state, aiSeat, difficulty);

    let result: { state: CassinoState; error?: string };
    if (move.kind === 'capture') {
      result = cassinoCapture(state, aiSeat, move.card, move.targetIds);
    } else if (move.kind === 'build') {
      result = cassinoBuild(state, aiSeat, move.card, move.targetIds, move.buildValue ?? 0);
    } else if (move.kind === 'trail') {
      result = cassinoTrail(state, aiSeat, move.card);
    } else {
      result = cassinoExtendOrTakeOverBuild(state, aiSeat, move.buildId!, move.card, move.buildValue ?? 0);
    }
    if (result.error) return null;

    const finished = result.state.status === 'finished';
    const updated = await this.prisma.cardGame.update({
      where: { id: gameId },
      data: {
        state: result.state as any,
        status: finished ? 'finished' : 'active',
        winnerSeat: result.state.winnerSeat,
        winnerTeam: result.state.winnerTeam,
      },
    });
    await this.logMove(gameId, aiSeat, move.kind, { card: move.card, targetIds: move.targetIds }, result.state);
    return { game: await this.finalizeIfDone(updated) };
  }

  // ---- Rooms ----

  async createRoom(
    hostId: string,
    mode: CardGameMode,
    isPrivate: boolean,
    maxSeats: number,
    settings: any,
  ) {
    return this.prisma.cardRoom.create({
      data: { hostId, mode, isPrivate, maxSeats, settings: settings as any, status: 'waiting' },
    });
  }

  async getRoom(roomId: string) {
    return this.prisma.cardRoom.findUnique({ where: { id: roomId } });
  }

  async getRoomByCode(roomCode: string) {
    return this.prisma.cardRoom.findUnique({ where: { roomCode } });
  }

  async listPublicRooms(mode?: CardGameMode) {
    return this.prisma.cardRoom.findMany({
      where: { isPrivate: false, status: 'waiting', ...(mode ? { mode } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async closeRoom(roomId: string) {
    return this.prisma.cardRoom.update({ where: { id: roomId }, data: { status: 'closed' } });
  }
}
