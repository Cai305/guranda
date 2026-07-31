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

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ride',
})
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

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
