import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WordBattleService } from './word-battle.service';
import { WordBattleMode, WordBattleDifficulty } from '@mxit2/types';
import * as boggleRules from './rules/boggle';

const AI_STEP_DELAY_MS = 1400;

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/wordbattle' })
export class WordBattleGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // gameId -> userId -> socketId, so Scrabble can send each seat its own
  // (rack-redacted) view instead of one shared broadcast.
  private gameSockets = new Map<string, Map<string, string>>();
  private aiRunning = new Set<string>();
  private boggleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly wordBattleService: WordBattleService) {}

  handleDisconnect(client: Socket) {
    this.wordBattleService.removeFromQueue(client.id);
  }

  private async broadcastGame(gameId: string, game: any) {
    const sockets = this.gameSockets.get(gameId);
    if (!sockets) return;
    const seats = game.seats as any[];
    for (const [userId, socketId] of sockets) {
      const seat = seats.find((s) => s.userId === userId);
      if (!seat) continue;
      const payload = this.wordBattleService.sanitizeGameForSeat(
        game,
        seat.seatIndex,
      );
      this.server.to(socketId).emit('game_updated', payload);
    }
  }

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @MessageBody()
    data: { mode: WordBattleMode; userId: string; displayName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.wordBattleService.joinQueue(
      data.mode,
      data.userId,
      data.displayName,
      client.id,
    );
    if (result.matchFound) {
      const game = await this.wordBattleService.createGame(
        data.mode,
        result.players.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          isAI: false,
        })),
        result.players[0].userId,
      );
      result.players.forEach((p) => {
        this.server.to(p.socketId).emit('match_found', { gameId: game.id });
      });
    }
  }

  @SubscribeMessage('leave_queue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.wordBattleService.removeFromQueue(client.id);
  }

  @SubscribeMessage('start_ai_game')
  async handleStartAIGame(
    @MessageBody()
    data: {
      mode: WordBattleMode;
      userId: string;
      displayName: string;
      difficulty: WordBattleDifficulty;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.wordBattleService.startAIGame(
      data.mode,
      data.userId,
      data.displayName,
      data.difficulty,
    );
    client.emit('game_created', { gameId: game.id });
  }

  @SubscribeMessage('join_game')
  async handleJoinGame(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.gameId);
    let sockets = this.gameSockets.get(data.gameId);
    if (!sockets) {
      sockets = new Map();
      this.gameSockets.set(data.gameId, sockets);
    }
    sockets.set(data.userId, client.id);

    const game = await this.wordBattleService.getGame(data.gameId);
    if (!game) return;

    if (game.mode === 'BOGGLE') this.ensureBoggleTimers(data.gameId, game);
    if (game.mode === 'SCRABBLE') this.maybeRunScrabbleAI(data.gameId);
    if (game.mode === 'WORDLE') this.maybeRunWordleAI(data.gameId);
  }

  // ---- Wordle ----

  @SubscribeMessage('wordle_guess')
  async handleWordleGuess(
    @MessageBody() data: { gameId: string; userId: string; word: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.wordBattleService.submitWordleGuess(
      data.gameId,
      data.userId,
      data.word,
    );
    if (!result || result.error) {
      client.emit('invalid_action', { reason: result?.error ?? 'guess' });
      return;
    }
    await this.broadcastGame(data.gameId, result.game);
    this.maybeRunWordleAI(data.gameId);
  }

  private async maybeRunWordleAI(gameId: string) {
    if (this.aiRunning.has(gameId)) return;
    let game = await this.wordBattleService.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'WORDLE') return;
    const aiSeat = this.wordBattleService.aiSeatIndex(game);
    if (aiSeat === null) return;
    const state = game.state as any;
    if (state.finishedSeats.includes(aiSeat)) return;

    this.aiRunning.add(gameId);
    try {
      while (game && game.status === 'active') {
        const s = game.state as any;
        if (s.finishedSeats.includes(aiSeat)) break;
        await new Promise((resolve) => setTimeout(resolve, AI_STEP_DELAY_MS));
        const updated = await this.wordBattleService.playWordleAITurn(gameId);
        if (!updated) break;
        game = updated.game;
        await this.broadcastGame(gameId, game);
        const newState = game.state as any;
        if (newState.finishedSeats.includes(aiSeat)) break;
      }
    } finally {
      this.aiRunning.delete(gameId);
    }
  }

  // ---- Boggle ----

  private ensureBoggleTimers(gameId: string, game: any) {
    if (this.boggleTimers.has(gameId)) return;
    if (game.status !== 'active') return;
    const state = game.state as boggleRules.BoggleInternalState;
    const elapsed = Date.now() - new Date(state.startedAt).getTime();
    const remaining = state.durationSeconds * 1000 - elapsed;

    const finishTimer = setTimeout(
      async () => {
        const finished = await this.wordBattleService.finalizeBoggle(gameId);
        if (finished) await this.broadcastGame(gameId, finished);
        this.boggleTimers.delete(gameId);
      },
      Math.max(0, remaining),
    );
    this.boggleTimers.set(gameId, finishTimer);

    const aiSeat = this.wordBattleService.aiSeatIndex(game);
    if (aiSeat !== null) this.runBoggleAI(gameId, game, aiSeat, remaining);
  }

  private async runBoggleAI(
    gameId: string,
    game: any,
    aiSeat: number,
    remainingMs: number,
  ) {
    const seats = game.seats as any[];
    const difficulty = seats[aiSeat].difficulty ?? 'medium';
    const solved = this.wordBattleService.solveBoggleBoard(game.state);
    const words = boggleRules.pickAIWords(solved, difficulty);
    if (words.length === 0) return;

    const interval = Math.max(1500, remainingMs / (words.length + 1));
    let i = 0;
    const timer = setInterval(async () => {
      i++;
      if (i > words.length) {
        clearInterval(timer);
        return;
      }
      const current = await this.wordBattleService.getGame(gameId);
      if (!current || current.status !== 'active') {
        clearInterval(timer);
        return;
      }
      const updated = await this.wordBattleService.submitAIBoggleWord(
        gameId,
        words[i - 1].word,
      );
      if (updated) await this.broadcastGame(gameId, updated);
    }, interval);
  }

  @SubscribeMessage('boggle_submit')
  async handleBoggleSubmit(
    @MessageBody() data: { gameId: string; userId: string; word: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.wordBattleService.submitBoggleWord(
      data.gameId,
      data.userId,
      data.word,
    );
    if (!result || 'error' in result) {
      client.emit('invalid_action', {
        reason: (result as any)?.error ?? 'word',
      });
      return;
    }
    await this.broadcastGame(data.gameId, result.game);
  }

  // ---- Scrabble ----

  @SubscribeMessage('scrabble_place')
  async handleScrabblePlace(
    @MessageBody() data: { gameId: string; userId: string; placements: any[] },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.wordBattleService.placeScrabbleWord(
      data.gameId,
      data.userId,
      data.placements,
    );
    if (!result || 'error' in result) {
      client.emit('invalid_action', {
        reason: (result as any)?.error ?? 'place',
      });
      return;
    }
    await this.broadcastGame(data.gameId, result.game);
    this.maybeRunScrabbleAI(data.gameId);
  }

  @SubscribeMessage('scrabble_pass')
  async handleScrabblePass(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.wordBattleService.passScrabble(
      data.gameId,
      data.userId,
    );
    if (!result || 'error' in result) {
      client.emit('invalid_action', {
        reason: (result as any)?.error ?? 'pass',
      });
      return;
    }
    await this.broadcastGame(data.gameId, result.game);
    this.maybeRunScrabbleAI(data.gameId);
  }

  @SubscribeMessage('scrabble_exchange')
  async handleScrabbleExchange(
    @MessageBody()
    data: { gameId: string; userId: string; rackIndices: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.wordBattleService.exchangeScrabble(
      data.gameId,
      data.userId,
      data.rackIndices,
    );
    if (!result || 'error' in result) {
      client.emit('invalid_action', {
        reason: (result as any)?.error ?? 'exchange',
      });
      return;
    }
    await this.broadcastGame(data.gameId, result.game);
    this.maybeRunScrabbleAI(data.gameId);
  }

  private async maybeRunScrabbleAI(gameId: string) {
    if (this.aiRunning.has(gameId)) return;
    const game = await this.wordBattleService.getGame(gameId);
    if (!game || game.status !== 'active' || game.mode !== 'SCRABBLE') return;
    const aiSeat = this.wordBattleService.aiSeatIndex(game);
    if (aiSeat === null) return;
    const state = game.state as any;
    if (state.currentSeat !== aiSeat) return;

    this.aiRunning.add(gameId);
    try {
      await new Promise((resolve) => setTimeout(resolve, AI_STEP_DELAY_MS));
      const updated = await this.wordBattleService.playScrabbleAITurn(gameId);
      if (updated) await this.broadcastGame(gameId, updated);
    } finally {
      this.aiRunning.delete(gameId);
    }
  }
}
