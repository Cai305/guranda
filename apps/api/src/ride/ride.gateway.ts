import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../auth/jwt-secret';
import { RideService } from './ride.service';

const LOBBY_ROOM = 'ride_lobby';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ride',
})
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private rideService: RideService) {}

  /**
   * On connect the client sends its JWT as `query.userId`.
   * We decode it to get the real userId and join the socket to that room,
   * so controller calls like `server.to(userId).emit(...)` work correctly.
   */
  handleConnection(client: Socket) {
    const token = client.handshake.query.userId as string;
    if (!token) return;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.userId || decoded.sub;
      if (userId) {
        client.join(userId);
        // Also store the userId on the socket for later reference
        (client as any).userId = userId;
        console.log(
          `RideGateway connected: socket=${client.id} user=${userId}`,
        );
      }
    } catch {
      // If token is not a valid JWT, fall back to using it as a literal room name
      // (preserves backwards compat for dev/test)
      client.join(token);
      console.log(
        `RideGateway connected (raw token room): socket=${client.id}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`RideGateway disconnected: ${client.id}`);
  }

  // ── Broadcast helpers — called from RideController/RideService after a DB
  // write, matching LiveGateway's convention (broadcastToRoom + typed
  // wrappers), instead of controllers reaching into `server.to().emit()`
  // directly the way this file used to. ──────────────────────────────────

  broadcastToRide(rideId: string, event: string, payload: any) {
    this.server.to(`ride_${rideId}`).emit(event, payload);
  }

  broadcastToUser(userId: string, event: string, payload: any) {
    this.server.to(userId).emit(event, payload);
  }

  /** Targeted — only the matched nearby drivers hear about a new request, not every connected socket. */
  notifyDrivers(driverIds: string[], event: string, payload: any) {
    driverIds.forEach((id) => this.server.to(id).emit(event, payload));
  }

  /** Idle riders sitting in the lobby room get live nearby-driver updates. */
  broadcastLobbyUpdate(payload: any) {
    this.server.to(LOBBY_ROOM).emit('onlineDriversUpdated', payload);
  }

  @SubscribeMessage('joinLobby')
  handleJoinLobby(client: Socket) {
    client.join(LOBBY_ROOM);
  }

  @SubscribeMessage('leaveLobby')
  handleLeaveLobby(client: Socket) {
    client.leave(LOBBY_ROOM);
  }

  @SubscribeMessage('updateLocation')
  handleLocationUpdate(
    _client: Socket,
    payload: { lat: number; lng: number; rideId?: string },
  ) {
    if (payload.rideId) {
      this.server
        .to(`ride_${payload.rideId}`)
        .emit('driverLocationUpdated', payload);
    }
  }

  /**
   * Continuous driver-location relay, independent of any active ride —
   * persists to DriverProfile (so getNearbyOnlineDrivers stays fresh for
   * matching) and, when idle (no rideId), rebroadcasts to the lobby so
   * riders' maps update live. Distinct from `updateLocation` above, which
   * only relays over the ride room without persisting.
   */
  @SubscribeMessage('updateDriverLocation')
  async handleDriverLocationUpdate(
    client: Socket,
    payload: { lat: number; lng: number; rideId?: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;

    await this.rideService.updateDriverLocation(userId, payload.lat, payload.lng);

    if (payload.rideId) {
      this.server
        .to(`ride_${payload.rideId}`)
        .emit('driverLocationUpdated', { lat: payload.lat, lng: payload.lng });
    } else {
      this.broadcastLobbyUpdate({
        userId,
        lat: payload.lat,
        lng: payload.lng,
      });
    }
  }

  /** Symmetric to driver location relay, for the driver to see the rider's live position mid-ride. */
  @SubscribeMessage('updateRiderLocation')
  handleRiderLocationUpdate(
    _client: Socket,
    payload: { lat: number; lng: number; rideId: string },
  ) {
    if (payload.rideId) {
      this.server
        .to(`ride_${payload.rideId}`)
        .emit('riderLocationUpdated', { lat: payload.lat, lng: payload.lng });
    }
  }

  @SubscribeMessage('joinRideRoom')
  handleJoinRideRoom(client: Socket, rideId: string) {
    client.join(`ride_${rideId}`);
  }

  @SubscribeMessage('joinOrderRoom')
  handleJoinOrderRoom(client: Socket, orderId: string) {
    client.join(`eat_order_${orderId}`);
  }

  @SubscribeMessage('updateOrderLocation')
  handleOrderLocationUpdate(
    _client: Socket,
    payload: { lat: number; lng: number; orderId: string },
  ) {
    if (payload.orderId) {
      this.server
        .to(`eat_order_${payload.orderId}`)
        .emit('orderLocationUpdated', payload);
    }
  }
}
