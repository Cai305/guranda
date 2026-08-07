import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';

// Real-time layer for Guranda Live: room-scoped chat and reactions,
// plus the "stream ended" signal broadcast when a host stops.
// Namespaced like ChessGateway so event names never collide with
// the default chat/presence gateway.
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/live',
})
export class LiveGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) {}

  // roomName -> userId -> { socketId, username } — the live viewer roster,
  // same pattern as CardsGateway's roomParticipants. Lets the host/mod
  // panel show who's actually here, and lets kick/ban target a specific
  // socket rather than broadcasting blind.
  private roomParticipants = new Map<
    string,
    Map<string, { socketId: string; username: string }>
  >();
  // socket.id -> { roomName, userId } — reverse lookup so a disconnect
  // (tab closed, app backgrounded) can find and clean up its roster entry
  // without the client having to explicitly emit leave_live_room first.
  private socketMeta = new Map<string, { roomName: string; userId: string }>();
  // roomName -> Set<userId> currently chat-muted — cached here (rather than
  // hit the DB on every message) and kept in sync by LiveService calling
  // setMuted() right after it persists a mute/unmute.
  private mutedUsers = new Map<string, Set<string>>();

  handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    this.socketMeta.delete(client.id);
    const participants = this.roomParticipants.get(meta.roomName);
    if (participants && participants.get(meta.userId)?.socketId === client.id) {
      participants.delete(meta.userId);
      this.broadcastParticipants(meta.roomName);
    }
  }

  @SubscribeMessage('join_live_room')
  handleJoin(
    @MessageBody() data: { roomName: string; userId?: string; username?: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomName);
    if (!data.userId) return; // anonymous/mock streams still work, just no roster entry
    let participants = this.roomParticipants.get(data.roomName);
    if (!participants) {
      participants = new Map();
      this.roomParticipants.set(data.roomName, participants);
    }
    participants.set(data.userId, {
      socketId: client.id,
      username: data.username || 'Guest',
    });
    this.socketMeta.set(client.id, { roomName: data.roomName, userId: data.userId });
    this.broadcastParticipants(data.roomName);
  }

  @SubscribeMessage('leave_live_room')
  handleLeave(
    @MessageBody() data: { roomName: string; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomName);
    if (data.userId) {
      this.roomParticipants.get(data.roomName)?.delete(data.userId);
      this.socketMeta.delete(client.id);
      this.broadcastParticipants(data.roomName);
    }
  }

  private broadcastParticipants(roomName: string) {
    const participants = this.roomParticipants.get(roomName);
    const list = participants
      ? Array.from(participants.entries()).map(([userId, p]) => ({
          userId,
          username: p.username,
        }))
      : [];
    this.server.to(roomName).emit('live_participants_update', { participants: list });
  }

  @SubscribeMessage('live_chat_message')
  handleChatMessage(
    @MessageBody()
    data: { roomName: string; senderId?: string; senderName: string; text: string },
  ) {
    if (!data.text?.trim()) return;
    if (data.senderId && this.mutedUsers.get(data.roomName)?.has(data.senderId)) return;
    this.server.to(data.roomName).emit('live_chat_message', {
      id: randomUUID(),
      senderId: data.senderId,
      senderName: data.senderName,
      text: data.text.trim(),
      ts: Date.now(),
    });
  }

  @SubscribeMessage('delete_chat_message')
  async handleDeleteChatMessage(
    @MessageBody() data: { roomName: string; messageId: string; userId: string },
  ) {
    if (!(await this.canModerate(data.roomName, data.userId))) return;
    this.server.to(data.roomName).emit('live_chat_message_deleted', {
      messageId: data.messageId,
    });
  }

  private async canModerate(roomName: string, userId: string): Promise<boolean> {
    const room = await this.prisma.liveRoom.findUnique({ where: { roomName } });
    if (!room) return false;
    if (room.hostId === userId) return true;
    const mod = await this.prisma.liveRoomModerator.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    return !!mod;
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

  // ── Moderation enforcement (called from LiveController after the REST
  // action persists to the DB) ────────────────────────────────────────────
  setMuted(roomName: string, userId: string, muted: boolean) {
    let set = this.mutedUsers.get(roomName);
    if (muted) {
      if (!set) {
        set = new Set();
        this.mutedUsers.set(roomName, set);
      }
      set.add(userId);
    } else {
      set?.delete(userId);
    }
  }

  kickUser(roomName: string, userId: string, reason: 'kicked' | 'banned') {
    const participant = this.roomParticipants.get(roomName)?.get(userId);
    if (!participant) return;
    const socket = this.server.sockets.sockets.get(participant.socketId);
    if (!socket) return;
    socket.emit('live_kicked', { reason });
    socket.leave(roomName);
    socket.disconnect(true);
    this.roomParticipants.get(roomName)?.delete(userId);
    this.broadcastParticipants(roomName);
  }
}
