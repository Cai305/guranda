import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PoolService } from './pool.service';

// 8-Ball Pool online matchmaking + relay. Physics is fully deterministic
// and runs client-side, so this gateway does two things: (1) relays raw
// shot inputs (angle/power) to the waiting player so their client can
// replay the identical animation locally, and (2) persists+broadcasts the
// authoritative result once the shooting client's simulation settles.
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/pool' })
export class PoolGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly poolService: PoolService) {}

  handleDisconnect(client: Socket) {
    this.poolService.removeFromQueue(client.id);
  }

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @MessageBody() data: { userId: string; displayName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.poolService.joinQueue(
      data.userId,
      data.displayName,
      client.id,
    );
    if (result.matchFound) {
      const game = await this.poolService.createGame(
        result.players.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
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
    this.poolService.removeFromQueue(client.id);
  }

  @SubscribeMessage('join_game')
  handleJoinGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.gameId);
  }

  // Relayed the instant SHOOT is pressed, so the opponent can start an
  // identical animated replay of the same shot in near real time.
  @SubscribeMessage('pool_shoot')
  handlePoolShoot(
    @MessageBody() data: { gameId: string; angle: number; power: number },
    @ConnectedSocket() client: Socket,
  ) {
    client
      .to(data.gameId)
      .emit('pool_shoot', { angle: data.angle, power: data.power });
  }

  // Sent once the shooting client's local simulation has fully settled —
  // this is what actually persists and becomes the shared source of truth.
  @SubscribeMessage('pool_result')
  async handlePoolResult(
    @MessageBody()
    data: { gameId: string; userId: string; balls: any; state: any },
    @ConnectedSocket() client: Socket,
  ) {
    const updated = await this.poolService.applyResult(
      data.gameId,
      data.userId,
      data.balls,
      data.state,
    );
    if (!updated) {
      client.emit('invalid_action', { reason: 'Not your turn' });
      return;
    }
    this.server.to(data.gameId).emit('game_updated', updated);
  }
}
