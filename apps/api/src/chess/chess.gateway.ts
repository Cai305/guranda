import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChessService } from './chess.service';
import type { ChessMovePayload } from '@mxit2/types';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chess', // Optional namespace to separate from chat
})
export class ChessGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chessService: ChessService) {}

  handleDisconnect(client: Socket) {
    this.chessService.removeFromQueue(client.id);
  }

  @SubscribeMessage('find_match')
  async handleFindMatch(
    @MessageBody() data: { userId: string; timeControl: number },
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.chessService.joinQueue(
      data.userId,
      client.id,
      data.timeControl,
    );

    if (result.matchFound && result.whiteId && result.blackId) {
      // Create DB record
      const game = await this.chessService.createGame(
        result.whiteId,
        result.blackId,
        data.timeControl,
      );

      // Notify both players by broadcasting to the timeControl queue room?
      // Better to just broadcast the match start to the entire namespace and let clients filter by userId,
      // or client joins a room with their userId.
      this.server.emit('match_found', {
        gameId: game.id,
        whiteId: result.whiteId,
        blackId: result.blackId,
      });
    }
  }

  @SubscribeMessage('join_game')
  handleJoinGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.gameId);
  }

  @SubscribeMessage('chess_move')
  async handleMakeMove(
    @MessageBody() data: ChessMovePayload & { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.chessService.makeMove(
      data.gameId,
      data.userId,
      data.from,
      data.to,
      data.promotion,
    );

    if (game) {
      // Broadcast updated game state
      this.server.to(data.gameId).emit('game_updated', game);
    } else {
      // Invalid move
      client.emit('invalid_move');
    }
  }

  @SubscribeMessage('resign_game')
  async handleResign(@MessageBody() data: { gameId: string; userId: string }) {
    const game = await this.chessService.resign(data.gameId, data.userId);
    if (game) {
      this.server.to(data.gameId).emit('game_updated', game);
    }
  }

  @SubscribeMessage('request_rematch')
  async handleRequestRematch(@MessageBody() data: { gameId: string; userId: string }) {
    // Broadcast to the game room so the opponent sees the request
    this.server.to(data.gameId).emit('rematch_requested', {
      gameId: data.gameId,
      requestedBy: data.userId,
    });
  }

  @SubscribeMessage('accept_rematch')
  async handleAcceptRematch(@MessageBody() data: { gameId: string; userId: string }) {
    const newGame = await this.chessService.createRematch(data.gameId);
    if (newGame) {
      // Notify both players in the old game room about the new game
      this.server.to(data.gameId).emit('rematch_started', {
        gameId: newGame.id,
        whiteId: newGame.whiteId,
        blackId: newGame.blackId,
      });
    }
  }

  @SubscribeMessage('decline_rematch')
  handleDeclineRematch(@MessageBody() data: { gameId: string; userId: string }) {
    this.server.to(data.gameId).emit('rematch_declined', {
      gameId: data.gameId,
      declinedBy: data.userId,
    });
  }
}
