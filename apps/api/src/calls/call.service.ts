import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { randomUUID } from 'crypto';

// Mints a fresh, 2-participant LiveKit room per 1:1 call, distinct from
// live.service.ts's broadcast (1 host, many viewers) rooms — both directions
// here get canPublish so either side can send audio/video, unlike a stream.
@Injectable()
export class CallService {
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
  private readonly wsUrl = process.env.LIVEKIT_WS_URL || 'ws://localhost:7880';
  private readonly roomService: RoomServiceClient;

  constructor() {
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
}
