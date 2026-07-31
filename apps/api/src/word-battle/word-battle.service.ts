import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WordBattleMode, WordBattleDifficulty } from '@mxit2/types';
import * as wordleRules from './rules/wordle';
import * as boggleRules from './rules/boggle';
import * as scrabbleRules from './rules/scrabble';

interface QueueEntry {
  userId: string;
  displayName: string;
  socketId: string;
}

interface SeatInput {
  userId: string | null;
  displayName: string;
  isAI: boolean;
  difficulty?: WordBattleDifficulty;
}

const AI_NAME = 'Guranda Bot';

@Injectable()
export class WordBattleService {
  private queues: Map<WordBattleMode, QueueEntry[]> = new Map();

  constructor(private prisma: PrismaService) {}

  // ---- Matchmaking ----

  joinQueue(
    mode: WordBattleMode,
    userId: string,
    displayName: string,
    socketId: string,
  ) {
    let list = this.queues.get(mode);
    if (!list) {
      list = [];
      this.queues.set(mode, list);
    }
    if (!list.find((p) => p.userId === userId))
      list.push({ userId, displayName, socketId });
    if (list.length >= 2)
      return { matchFound: true, players: list.splice(0, 2) };
    return { matchFound: false, players: [] as QueueEntry[] };
  }

  removeFromQueue(socketId: string) {
    for (const list of this.queues.values()) {
      const idx = list.findIndex((p) => p.socketId === socketId);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  // ---- Game lifecycle ----

  private createStateForMode(mode: WordBattleMode) {
    if (mode === 'WORDLE') return wordleRules.createInitialState();
    if (mode === 'BOGGLE') return boggleRules.createInitialState();
    return scrabbleRules.createInitialState();
  }

  async createGame(
    mode: WordBattleMode,
    players: SeatInput[],
    createdById: string,
    wager = 0,
  ) {
    const seats = players.map((p, i) => ({
      seatIndex: i,
      userId: p.userId,
      isAI: p.isAI,
      displayName: p.displayName,
      difficulty: p.difficulty,
    }));
    const state = this.createStateForMode(mode);
    return this.prisma.wordBattleGame.create({
      data: {
        mode,
        seats: seats as any,
        state: state as any,
        status: 'active',
        wager,
        createdById,
      },
    });
  }

  async startAIGame(
    mode: WordBattleMode,
    userId: string,
    displayName: string,
    difficulty: WordBattleDifficulty,
    wager = 0,
  ) {
    return this.createGame(
      mode,
      [
        { userId, displayName, isAI: false },
        { userId: null, displayName: AI_NAME, isAI: true, difficulty },
      ],
      userId,
      wager,
    );
  }

  async getGame(gameId: string) {
    return this.prisma.wordBattleGame.findUnique({ where: { id: gameId } });
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

  // ---- Wordle ----

  async submitWordleGuess(gameId: string, userId: string, word: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'WORDLE')
      return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;

    const { state: newState, error } = wordleRules.applyGuess(
      game.state as any,
      seatIndex,
      word,
    );
    if (error) return { error };

    const seatCount = (game.seats as any[]).length;
    const roundOver = wordleRules.isRoundOver(newState, seatCount);
    const winnerSeat = roundOver ? wordleRules.determineWinner(newState) : null;

    const updated = await this.prisma.wordBattleGame.update({
      where: { id: gameId },
      data: {
        state: newState as any,
        status: roundOver ? 'finished' : 'active',
        winnerSeat,
      },
    });
    return { game: updated };
  }

  async playWordleAITurn(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'WORDLE')
      return null;
    const aiSeat = this.aiSeatIndex(game);
    if (aiSeat === null) return null;
    const state = game.state as any as wordleRules.WordleInternalState;
    if (state.finishedSeats.includes(aiSeat)) return null;
    const seats = game.seats as any[];
    const guess = wordleRules.chooseAIGuess(
      state,
      aiSeat,
      seats[aiSeat].difficulty ?? 'medium',
    );

    const { state: newState } = wordleRules.applyGuess(state, aiSeat, guess);
    const roundOver = wordleRules.isRoundOver(newState, seats.length);
    const winnerSeat = roundOver ? wordleRules.determineWinner(newState) : null;
    return {
      game: await this.prisma.wordBattleGame.update({
        where: { id: gameId },
        data: {
          state: newState as any,
          status: roundOver ? 'finished' : 'active',
          winnerSeat,
        },
      }),
    };
  }

  // ---- Boggle ----

  async submitBoggleWord(gameId: string, userId: string, word: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'BOGGLE')
      return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;

    const state = game.state as any as boggleRules.BoggleInternalState;
    if (boggleRules.isRoundOver(state)) {
      const finished = await this.finalizeBoggle(gameId);
      return finished ? { game: finished } : null;
    }

    const { state: newState, error } = boggleRules.submitWord(
      state,
      seatIndex,
      word,
    );
    if (error) return { error };

    const updated = await this.prisma.wordBattleGame.update({
      where: { id: gameId },
      data: { state: newState as any },
    });
    return { game: updated };
  }

  async submitAIBoggleWord(gameId: string, word: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'BOGGLE')
      return null;
    const aiSeat = this.aiSeatIndex(game);
    if (aiSeat === null) return null;
    const state = game.state as any as boggleRules.BoggleInternalState;
    if (boggleRules.isRoundOver(state)) return null;
    const { state: newState } = boggleRules.submitWord(state, aiSeat, word);
    return this.prisma.wordBattleGame.update({
      where: { id: gameId },
      data: { state: newState as any },
    });
  }

  solveBoggleBoard(state: boggleRules.BoggleInternalState) {
    return boggleRules.solveBoard(state.grid);
  }

  async finalizeBoggle(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status === 'finished' || game.mode !== 'BOGGLE')
      return null;
    const finalState = boggleRules.finalizeScores(game.state as any);
    const winnerSeat =
      finalState.scores[0] === finalState.scores[1]
        ? null
        : finalState.scores[0] > finalState.scores[1]
          ? 0
          : 1;
    return this.prisma.wordBattleGame.update({
      where: { id: gameId },
      data: { state: finalState as any, status: 'finished', winnerSeat },
    });
  }

  // ---- Scrabble ----

  private async afterScrabbleMove(
    gameId: string,
    newState: scrabbleRules.ScrabbleInternalState,
  ) {
    let finalState = newState;
    let winnerSeat: number | null = null;
    let status: 'active' | 'finished' = 'active';
    if (scrabbleRules.checkGameOver(newState)) {
      finalState = scrabbleRules.finalizeEndgame(newState);
      status = 'finished';
      winnerSeat =
        finalState.scores[0] === finalState.scores[1]
          ? null
          : finalState.scores[0] > finalState.scores[1]
            ? 0
            : 1;
    }
    return this.prisma.wordBattleGame.update({
      where: { id: gameId },
      data: { state: finalState as any, status, winnerSeat },
    });
  }

  async placeScrabbleWord(gameId: string, userId: string, placements: any[]) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'SCRABBLE')
      return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const { state: newState, error } = scrabbleRules.applyPlacement(
      game.state as any,
      seatIndex,
      placements,
    );
    if (error) return { error };
    return { game: await this.afterScrabbleMove(gameId, newState) };
  }

  async passScrabble(gameId: string, userId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'SCRABBLE')
      return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const { state: newState, error } = scrabbleRules.applyPass(
      game.state as any,
      seatIndex,
    );
    if (error) return { error };
    return { game: await this.afterScrabbleMove(gameId, newState) };
  }

  async exchangeScrabble(
    gameId: string,
    userId: string,
    rackIndices: number[],
  ) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'SCRABBLE')
      return null;
    const seatIndex = this.seatOf(game, userId);
    if (seatIndex === null) return null;
    const { state: newState, error } = scrabbleRules.applyExchange(
      game.state as any,
      seatIndex,
      rackIndices,
    );
    if (error) return { error };
    return { game: await this.afterScrabbleMove(gameId, newState) };
  }

  async playScrabbleAITurn(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'SCRABBLE')
      return null;
    const aiSeat = this.aiSeatIndex(game);
    if (aiSeat === null) return null;
    const state = game.state as any as scrabbleRules.ScrabbleInternalState;
    if (state.currentSeat !== aiSeat) return null;
    const seats = game.seats as any[];
    const difficulty = seats[aiSeat].difficulty ?? 'medium';
    const move = scrabbleRules.chooseAIMove(state, aiSeat, difficulty);
    if (!move) {
      const { state: passedState } = scrabbleRules.applyPass(state, aiSeat);
      return this.afterScrabbleMove(gameId, passedState);
    }
    const { state: newState, error } = scrabbleRules.applyPlacement(
      state,
      aiSeat,
      move.placements,
    );
    if (error) {
      const { state: passedState } = scrabbleRules.applyPass(state, aiSeat);
      return this.afterScrabbleMove(gameId, passedState);
    }
    return this.afterScrabbleMove(gameId, newState);
  }

  // ---- Sanitization ----

  sanitizeGameForSeat(game: any, seatIndex: number) {
    const isFinished = game.status === 'finished';
    let state = game.state;
    if (game.mode === 'WORDLE') {
      state = wordleRules.sanitizeWordleState(game.state, isFinished);
    } else if (game.mode === 'BOGGLE') {
      const { words, ...rest } = game.state as boggleRules.BoggleInternalState;
      state = rest;
    } else if (game.mode === 'SCRABBLE') {
      state = scrabbleRules.sanitizeScrabbleState(game.state, seatIndex);
    }
    return { ...game, state };
  }
}
