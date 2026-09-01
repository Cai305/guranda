import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Chess } from 'chess.js';

@Injectable()
export class ChessService {
  // timeControl -> { socketId, userId }
  private queue: Map<number, { socketId: string; userId: string }[]> =
    new Map();

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  joinQueue(userId: string, socketId: string, timeControl: number) {
    let list = this.queue.get(timeControl);
    if (!list) {
      list = [];
      this.queue.set(timeControl, list);
    }

    const opponentIndex = list.findIndex((p) => p.userId !== userId);
    if (opponentIndex !== -1) {
      const opponent = list[opponentIndex];
      list.splice(opponentIndex, 1);
      return { matchFound: true, whiteId: opponent.userId, blackId: userId };
    } else {
      if (!list.find((p) => p.userId === userId)) {
        list.push({ userId, socketId });
      }
      return { matchFound: false };
    }
  }

  removeFromQueue(socketId: string) {
    for (const [, list] of this.queue.entries()) {
      const idx = list.findIndex((p) => p.socketId === socketId);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
    }
  }

  async createGame(
    whiteId: string,
    blackId: string,
    timeControl: number,
    notify = true,
  ) {
    const chess = new Chess();
    const game = await this.prisma.chessGame.create({
      data: {
        whiteId,
        blackId,
        pgn: chess.pgn(),
        fen: chess.fen(),
        status: 'active',
        timeControl,
        whiteTime: timeControl,
        blackTime: timeControl,
      },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
    if (notify) {
      for (const userId of [whiteId, blackId]) {
        await this.notifications.create(
          userId,
          'chess.invite',
          'Chess match found',
          "You've been matched into a chess game",
          { gameId: game.id },
        );
      }
    }
    return game;
  }

  async makeMove(
    gameId: string,
    userId: string,
    from: string,
    to: string,
    promotion?: string,
  ) {
    const game = await this.prisma.chessGame.findUnique({
      where: { id: gameId },
    });
    if (!game || game.status !== 'active') return null;

    const chess = new Chess();
    try {
      chess.loadPgn(game.pgn);
    } catch {
      chess.load(game.fen);
    }

    const turn = chess.turn();
    if (turn === 'w' && game.whiteId !== userId) return null;
    if (turn === 'b' && game.blackId !== userId) return null;

    try {
      chess.move({ from, to, promotion });
    } catch {
      return null; // Invalid move
    }

    let status = 'active';
    if (chess.isCheckmate()) {
      status = turn === 'w' ? 'white_won' : 'black_won';
    } else if (
      chess.isDraw() ||
      chess.isStalemate() ||
      chess.isThreefoldRepetition() ||
      chess.isInsufficientMaterial()
    ) {
      status = 'draw';
    }

    let whiteTime = game.whiteTime;
    let blackTime = game.blackTime;
    const now = new Date();

    if (game.timeControl > 0 && game.pgn !== '') {
      const elapsed = Math.floor(
        (now.getTime() - game.lastMoveAt.getTime()) / 1000,
      );
      if (turn === 'w') {
        whiteTime -= elapsed;
        if (whiteTime <= 0) {
          whiteTime = 0;
          status = 'black_won';
        }
      } else {
        blackTime -= elapsed;
        if (blackTime <= 0) {
          blackTime = 0;
          status = 'white_won';
        }
      }
    }

    return this.prisma.chessGame.update({
      where: { id: gameId },
      data: {
        pgn: chess.pgn(),
        fen: chess.fen(),
        status,
        whiteTime,
        blackTime,
        lastMoveAt: now,
      },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
  }

  async resign(gameId: string, userId: string) {
    const game = await this.prisma.chessGame.findUnique({
      where: { id: gameId },
    });
    if (!game || game.status !== 'active') return null;

    let status = game.status;
    const opponentId = game.whiteId === userId ? game.blackId : game.whiteId;
    if (game.whiteId === userId) status = 'black_won';
    else if (game.blackId === userId) status = 'white_won';

    const updated = await this.prisma.chessGame.update({
      where: { id: gameId },
      data: { status },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });

    if (opponentId) {
      await this.notifications.create(
        opponentId,
        'chess.resigned',
        'Opponent resigned',
        'Your opponent resigned — you win!',
        { gameId },
      );
    }

    return updated;
  }

  async getGame(gameId: string) {
    return this.prisma.chessGame.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });
  }

  async createRematch(originalGameId: string) {
    const original = await this.prisma.chessGame.findUnique({
      where: { id: originalGameId },
    });
    if (!original) return null;

    // Swap colors for the rematch
    const rematch = await this.createGame(
      original.blackId,
      original.whiteId,
      original.timeControl,
      false,
    );
    for (const userId of [original.whiteId, original.blackId]) {
      await this.notifications.create(
        userId,
        'chess.rematch_offer',
        'Rematch started',
        'A new rematch game has started',
        { gameId: rematch.id, originalGameId },
      );
    }
    return rematch;
  }
}
