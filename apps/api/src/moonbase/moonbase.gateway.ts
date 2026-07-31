import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// MoonBase 2.0 — the Guranda social world. Themed rooms with live presence,
// room chat and hangouts. State is in-memory: rooms are lightweight social
// spaces, not persistent chat history.

interface MoonMember {
  userId: string;
  name: string;
  avatarUrl: string;
  joinedAt: number;
}

interface MoonMessage {
  id: string;
  roomId: string;
  userId: string;
  name: string;
  avatarUrl: string;
  text: string;
  at: number;
}

export const MOON_ROOMS: {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
}[] = [
  {
    id: 'lunar-lounge',
    name: 'Lunar Lounge',
    emoji: '🛋️',
    blurb: 'Chill chat under the stars',
  },
  {
    id: 'crater-club',
    name: 'Crater Club',
    emoji: '🎧',
    blurb: 'Music, vibes and late nights',
  },
  {
    id: 'gamers-galaxy',
    name: "Gamers' Galaxy",
    emoji: '🎮',
    blurb: 'Find opponents, talk games',
  },
  {
    id: 'love-orbit',
    name: 'Love Orbit',
    emoji: '💘',
    blurb: 'Meet someone new',
  },
  {
    id: 'study-station',
    name: 'Study Station',
    emoji: '📚',
    blurb: 'Focus together, help each other',
  },
  {
    id: 'trade-post',
    name: 'Trade Post',
    emoji: '🛰️',
    blurb: 'Deals, hustles and marketplace talk',
  },
];

const MAX_MESSAGES = 40;
let msgCounter = 0;

@WebSocketGateway({ namespace: 'moonbase', cors: { origin: '*' } })
export class MoonbaseGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // roomId -> (socketId -> member)
  private rooms = new Map<string, Map<string, MoonMember>>();
  // roomId -> recent messages ring buffer
  private messages = new Map<string, MoonMessage[]>();
  // socketId -> roomId (for disconnect cleanup)
  private socketRoom = new Map<string, string>();

  private roomMembers(roomId: string): Map<string, MoonMember> {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Map());
    return this.rooms.get(roomId)!;
  }

  private lobbySnapshot() {
    return MOON_ROOMS.map((r) => ({
      ...r,
      occupancy: this.rooms.get(r.id)?.size || 0,
    }));
  }

  private broadcastPresence(roomId: string) {
    const members = Array.from(this.roomMembers(roomId).values());
    this.server.to(roomId).emit('moon_presence', { roomId, members });
  }

  handleDisconnect(client: Socket) {
    const roomId = this.socketRoom.get(client.id);
    if (roomId) {
      this.roomMembers(roomId).delete(client.id);
      this.socketRoom.delete(client.id);
      this.broadcastPresence(roomId);
    }
  }

  @SubscribeMessage('moon_lobby')
  handleLobby(@ConnectedSocket() client: Socket) {
    client.emit('moon_rooms', this.lobbySnapshot());
  }

  @SubscribeMessage('moon_join')
  handleJoin(
    @MessageBody()
    data: { roomId: string; userId: string; name: string; avatarUrl: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Leave any previous room first
    const prev = this.socketRoom.get(client.id);
    if (prev && prev !== data.roomId) {
      this.roomMembers(prev).delete(client.id);
      client.leave(prev);
      this.broadcastPresence(prev);
    }

    client.join(data.roomId);
    this.socketRoom.set(client.id, data.roomId);
    this.roomMembers(data.roomId).set(client.id, {
      userId: data.userId,
      name: data.name,
      avatarUrl: data.avatarUrl,
      joinedAt: Date.now(),
    });

    client.emit('moon_joined', {
      roomId: data.roomId,
      members: Array.from(this.roomMembers(data.roomId).values()),
      messages: this.messages.get(data.roomId) || [],
    });
    this.broadcastPresence(data.roomId);
  }

  @SubscribeMessage('moon_leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    const roomId = this.socketRoom.get(client.id);
    if (!roomId) return;
    this.roomMembers(roomId).delete(client.id);
    this.socketRoom.delete(client.id);
    client.leave(roomId);
    this.broadcastPresence(roomId);
  }

  @SubscribeMessage('moon_message')
  handleMessage(
    @MessageBody() data: { roomId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const member = this.roomMembers(data.roomId).get(client.id);
    if (!member || !data.text?.trim()) return;
    const msg: MoonMessage = {
      id: `m${++msgCounter}`,
      roomId: data.roomId,
      userId: member.userId,
      name: member.name,
      avatarUrl: member.avatarUrl,
      text: data.text.trim().slice(0, 500),
      at: Date.now(),
    };
    const buf = this.messages.get(data.roomId) || [];
    buf.push(msg);
    if (buf.length > MAX_MESSAGES) buf.shift();
    this.messages.set(data.roomId, buf);
    this.server.to(data.roomId).emit('moon_message', msg);
  }
}
