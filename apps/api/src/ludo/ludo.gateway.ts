import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LudoService } from './ludo.service';
import { LudoMode } from '@mxit2/types';

const AI_STEP_DELAY_MS = 700;

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ludo',
})
export class LudoGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private aiRunning = new Set<string>();

  constructor(private readonly ludoService: LudoService) {}

  handleDisconnect(client: Socket) {
    this.ludoService.removeFromQueue(client.id);
  }

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @MessageBody()
    data: { mode: LudoMode; userId: string; displayName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.ludoService.joinQueue(
      data.mode,
      data.userId,
      data.displayName,
      client.id,
    );
    if (result.matchFound) {
      const game = await this.ludoService.createGame(
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
    this.ludoService.removeFromQueue(client.id);
  }

  @SubscribeMessage('start_ai_game')
  async handleStartAIGame(
    @MessageBody()
    data: { mode: LudoMode; userId: string; displayName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.ludoService.startAIGame(
      data.mode,
      data.userId,
      data.displayName,
    );
    client.emit('game_created', { gameId: game.id });
  }

  @SubscribeMessage('join_game')
  handleJoinGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.gameId);
  }

  @SubscribeMessage('roll_dice')
  async handleRollDice(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.ludoService.rollDice(data.gameId, data.userId);
    if (!game) {
      client.emit('invalid_action', { reason: 'roll' });
      return;
    }
    this.server.to(data.gameId).emit('game_updated', game);
    this.maybeRunAI(data.gameId);
  }

  @SubscribeMessage('move_token')
  async handleMoveToken(
    @MessageBody() data: { gameId: string; userId: string; tokenIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.ludoService.moveToken(
      data.gameId,
      data.userId,
      data.tokenIndex,
    );
    if (!game) {
      client.emit('invalid_action', { reason: 'move' });
      return;
    }
    this.server.to(data.gameId).emit('game_updated', game);
    this.maybeRunAI(data.gameId);
  }

  // ── In-game quick reactions & chat ────────────────────────────────────────
  // Deliberately ephemeral (no DB persistence) — a live reaction/chat burst
  // between two people already sharing a game room, same spirit as the
  // roll/move events above. A player who reconnects mid-game just won't see
  // history before they joined, which is an acceptable tradeoff for what
  // this is (a lightweight in-match aside, not a real conversation thread —
  // apps/api/src/chat is the real persisted messaging system).
  @SubscribeMessage('send_emoji')
  handleSendEmoji(
    @MessageBody() data: { gameId: string; userId: string; emoji: string },
  ) {
    this.server.to(data.gameId).emit('emoji_received', {
      userId: data.userId,
      emoji: data.emoji,
    });
  }

  @SubscribeMessage('send_chat')
  handleSendChat(
    @MessageBody() data: { gameId: string; userId: string; displayName: string; text: string },
  ) {
    const text = (data.text || '').trim().slice(0, 200);
    if (!text) return;
    this.server.to(data.gameId).emit('chat_received', {
      userId: data.userId,
      displayName: data.displayName,
      text,
    });
  }

  // Repeatedly plays AI turns (with a short delay between each, so
  // spectating humans can actually see it happen) until control
  // returns to a human seat or the game ends.
  private async maybeRunAI(gameId: string) {
    if (this.aiRunning.has(gameId)) return;

    let game = await this.ludoService.getGame(gameId);
    if (!game || game.status !== 'active') return;
    const seat = (game.seats as any[])[game.currentSeat];
    if (!seat.isAI) return;

    this.aiRunning.add(gameId);
    try {
      while (
        game &&
        game.status === 'active' &&
        (game.seats as any[])[game.currentSeat].isAI
      ) {
        await new Promise((resolve) => setTimeout(resolve, AI_STEP_DELAY_MS));
        const updated = await this.ludoService.playAITurn(gameId);
        if (!updated) break;
        game = updated;
        this.server.to(gameId).emit('game_updated', game);
      }
    } finally {
      this.aiRunning.delete(gameId);
    }
  }
}
