import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MurabarabaService } from './murabaraba.service';
import type {
  MurabarabaJoinQueuePayload,
  MurabarabaPlacePayload,
  MurabarabaMovePayload,
  MurabarabaShootPayload,
} from '@mxit2/types';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/murabaraba',
})
export class MurabarabaGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly murabarabaService: MurabarabaService) {}

  handleDisconnect(client: Socket) {
    this.murabarabaService.removeFromQueue(client.id);
  }

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @MessageBody() data: MurabarabaJoinQueuePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.murabarabaService.joinQueue(
      data.mode,
      data.userId,
      data.displayName,
      client.id,
    );
    if (result.matchFound) {
      const game = await this.murabarabaService.createGame(
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
    this.murabarabaService.removeFromQueue(client.id);
  }

  @SubscribeMessage('join_game')
  handleJoinGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.gameId);
  }

  @SubscribeMessage('place_cow')
  async handlePlace(
    @MessageBody() data: MurabarabaPlacePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.murabarabaService.place(
      data.gameId,
      data.userId,
      data.to,
    );
    if (!game) {
      client.emit('invalid_action', { reason: 'place' });
      return;
    }
    this.server.to(data.gameId).emit('game_updated', game);
  }

  @SubscribeMessage('move_cow')
  async handleMove(
    @MessageBody() data: MurabarabaMovePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.murabarabaService.move(
      data.gameId,
      data.userId,
      data.from,
      data.to,
    );
    if (!game) {
      client.emit('invalid_action', { reason: 'move' });
      return;
    }
    this.server.to(data.gameId).emit('game_updated', game);
  }

  @SubscribeMessage('shoot_cow')
  async handleShoot(
    @MessageBody() data: MurabarabaShootPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.murabarabaService.shoot(
      data.gameId,
      data.userId,
      data.at,
    );
    if (!game) {
      client.emit('invalid_action', { reason: 'shoot' });
      return;
    }
    this.server.to(data.gameId).emit('game_updated', game);
  }
}
