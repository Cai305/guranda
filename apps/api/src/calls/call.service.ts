import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';

// Mints a fresh, 2-participant LiveKit room per 1:1 call, distinct from
// live.service.ts's broadcast (1 host, many viewers) rooms — both directions
// here get canPublish so either side can send audio/video, unlike a stream.
// Also owns the Call table now — a call used to be purely ephemeral
// (chat.gateway.ts's in-memory pendingCalls Map only); this is what gives
// calls a duration, a call log, and a durable "missed call" record.
@Injectable()
export class CallService {
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
  private readonly wsUrl = process.env.LIVEKIT_WS_URL || 'ws://localhost:7880';
  private readonly roomService: RoomServiceClient;

  constructor(private prisma: PrismaService) {
    const httpUrl = process.env.LIVEKIT_HTTP_URL || 'http://localhost:7880';
    this.roomService = new RoomServiceClient(
      httpUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  private mintToken(roomName: string, identity: string, name: string) {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name,
    });
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return token.toJwt();
  }

  async createCall(
    callerId: string,
    callerName: string,
    calleeId: string,
    calleeName: string,
  ) {
    const roomName = `call-${randomUUID()}`;
    await this.roomService.createRoom({
      name: roomName,
      emptyTimeout: 60,
      maxParticipants: 2,
    });
    const [callerToken, calleeToken] = await Promise.all([
      this.mintToken(roomName, callerId, callerName),
      this.mintToken(roomName, calleeId, calleeName),
    ]);
    return { roomName, wsUrl: this.wsUrl, callerToken, calleeToken };
  }

  async endCall(roomName: string) {
    try {
      await this.roomService.deleteRoom(roomName);
    } catch {
      // Already empty/gone on the LiveKit side — not fatal.
    }
  }

  // ── Call persistence ────────────────────────────────────────────────────

  recordRinging(callerId: string, calleeId: string, type: 'voice' | 'video', roomName: string) {
    return this.prisma.call.create({
      data: { callerId, calleeId, type, status: 'ringing', roomName },
    });
  }

  markOngoing(callId: string) {
    return this.prisma.call.update({
      where: { id: callId },
      data: { status: 'ongoing', connectedAt: new Date() },
    });
  }

  async markEnded(callId: string, status: 'completed' | 'missed' | 'declined') {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) return null;
    const endedAt = new Date();
    const durationSeconds = call.connectedAt
      ? Math.max(0, Math.round((endedAt.getTime() - call.connectedAt.getTime()) / 1000))
      : null;
    return this.prisma.call.update({
      where: { id: callId },
      data: { status, endedAt, durationSeconds },
    });
  }

  async getLog(userId: string, take = 30, cursor?: string) {
    const calls = await this.prisma.call.findMany({
      where: { OR: [{ callerId: userId }, { calleeId: userId }] },
      orderBy: { startedAt: 'desc' },
      take: Math.min(take, 50),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        caller: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        callee: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
    return calls.map((c) => {
      const isOutgoing = c.callerId === userId;
      const peer = isOutgoing ? c.callee : c.caller;
      return {
        id: c.id,
        peerId: peer.id,
        peerName: peer.profile?.displayName || peer.username,
        peerAvatarUrl: peer.profile?.avatarUrl ?? null,
        type: c.type,
        status: c.status,
        direction: isOutgoing ? 'outgoing' : 'incoming',
        startedAt: c.startedAt,
        durationSeconds: c.durationSeconds,
      };
    });
  }
}
