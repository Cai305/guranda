import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TurboRacingService } from './turbo-racing.service';
import type {
  TurboRacingJoinQueuePayload,
  TurboRacingProgressPayload,
} from '@mxit2/types';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/turbo-racing',
})
export class TurboRacingGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly turboRacingService: TurboRacingService) {}

  handleDisconnect(client: Socket) {
    this.turboRacingService.removeFromQueue(client.id);
  }

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @MessageBody() data: TurboRacingJoinQueuePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.turboRacingService.joinQueue(
      data.userId,
      data.displayName,
      client.id,
    );
    if (result.matchFound) {
      const race = await this.turboRacingService.createRace(
        result.players.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
        })),
        result.players[0].userId,
      );
      result.players.forEach((p) => {
        this.server.to(p.socketId).emit('match_found', { raceId: race.id });
      });
    }
  }

  @SubscribeMessage('leave_queue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.turboRacingService.removeFromQueue(client.id);
  }

  @SubscribeMessage('join_race')
  handleJoinRace(
    @MessageBody() data: { raceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.raceId);
  }

  @SubscribeMessage('report_progress')
  async handleReportProgress(@MessageBody() data: TurboRacingProgressPayload) {
    const race = await this.turboRacingService.reportProgress(
      data.raceId,
      data.userId,
      {
        distance: data.distance,
        lane: data.lane,
        crashed: data.crashed,
        coins: data.coins,
      },
    );
    if (!race) return;
    this.server.to(data.raceId).emit('race_updated', race);
  }
}
