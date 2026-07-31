import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';

// Real-time layer for Guranda Live: room-scoped chat and reactions,
// plus the "stream ended" signal broadcast when a host stops.
// Namespaced like ChessGateway so event names never collide with
// the default chat/presence gateway.
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/live',
})
export class LiveGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_live_room')
  handleJoin(
    @MessageBody() data: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomName);
  }

  @SubscribeMessage('leave_live_room')
  handleLeave(
    @MessageBody() data: { roomName: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomName);
  }

  @SubscribeMessage('live_chat_message')
  handleChatMessage(
    @MessageBody() data: { roomName: string; senderName: string; text: string },
  ) {
    if (!data.text?.trim()) return;
    this.server.to(data.roomName).emit('live_chat_message', {
      id: randomUUID(),
      senderName: data.senderName,
      text: data.text.trim(),
      ts: Date.now(),
    });
  }

  @SubscribeMessage('live_reaction')
  handleReaction(@MessageBody() data: { roomName: string; emoji: string }) {
    this.server.to(data.roomName).emit('live_reaction', { emoji: data.emoji });
  }

  broadcastRoomEnded(roomName: string) {
    this.server.to(roomName).emit('live_room_ended');
  }

  // Generic event relay used by every category feature (pinned
  // product/food, linked game, scoreboard, quizzes, polls,
  // predictions, job postings, questions) — one socket.io room per
  // LiveKit roomName, one event name per feature so viewer screens
  // only need to subscribe to the events their category cares about.
  broadcastToRoom(roomName: string, event: string, payload: any) {
    this.server.to(roomName).emit(event, payload);
  }

  @SubscribeMessage('live_audio_room_event')
  handleAudioRoomEvent(
    @MessageBody() data: { roomName: string; type: string; payload: any },
  ) {
    this.server.to(data.roomName).emit('live_audio_room_event', {
      type: data.type,
      payload: data.payload,
      ts: Date.now(),
    });
  }

  broadcastGift(
    roomName: string,
    gift: {
      giftType: string;
      icon: string;
      label: string;
      amount: number;
      senderName: string;
      message: string | null;
    },
  ) {
    this.server.to(roomName).emit('live_gift', gift);
  }
}
