import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class RideSocketService {
  public socket: Socket | null = null;
  private connectPromise: Promise<Socket | null> | null = null;
  // The token the current socket (or in-flight connection attempt) was
  // opened with. `connect()` compares this against the currently stored
  // token on every call — without it, once connected this class would
  // memoize `connectPromise` forever and just hand back the same socket
  // regardless of who's actually signed in now, even after a logout +
  // different-account login with no app restart in between. That socket
  // is still joined to the OLD user's server-side room, so every per-user
  // push meant for the new user (rideRequested, rideAccepted, ...) has
  // nowhere to land — this is what made matched drivers never receive
  // 'rideRequested' after an account switch.
  private connectedToken: string | null = null;

  private async readToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem('userToken'); } catch { return null; }
    }
    return SecureStore.getItemAsync('userToken');
  }

  /**
   * Returns a promise that resolves once the socket is connected.
   * Reuses the existing connection only while it's still for the
   * currently-stored token; otherwise tears it down and reconnects fresh.
   */
  async connect(): Promise<Socket | null> {
    const token = await this.readToken();
    if (!token) {
      console.warn('RideSocket: no auth token, skipping connect');
      this.disconnect();
      return null;
    }

    if (this.connectPromise && this.connectedToken === token) {
      return this.connectPromise;
    }

    this.disconnect();
    this.connectedToken = token;

    this.connectPromise = new Promise<Socket | null>((resolve) => {
      try {
        this.socket = io(`${API_BASE_URL}/ride`, {
          query: { userId: token },
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('RideSocket connected', this.socket?.id);
          resolve(this.socket);
        });

        this.socket.on('connect_error', (err) => {
          console.warn('RideSocket connect_error:', err.message);
          // Still resolve so callers don't hang forever — socket will retry
          resolve(this.socket);
        });
      } catch (e) {
        console.error('RideSocket connect failed:', e);
        resolve(null);
      }
    });

    return this.connectPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectPromise = null;
    this.connectedToken = null;
  }

  joinRideRoom(rideId: string) {
    if (this.socket) {
      this.socket.emit('joinRideRoom', rideId);
    }
  }

  updateLocation(lat: number, lng: number, rideId?: string) {
    if (this.socket) {
      this.socket.emit('updateLocation', { lat, lng, rideId });
    }
  }

  /** Idle riders join this to receive live nearby-driver updates. */
  joinLobby() {
    if (this.socket) this.socket.emit('joinLobby');
  }

  leaveLobby() {
    if (this.socket) this.socket.emit('leaveLobby');
  }

  /** Continuous driver-location relay — call with no rideId while online/idle, with rideId once a ride is active. */
  updateDriverLocation(lat: number, lng: number, rideId?: string) {
    if (this.socket) this.socket.emit('updateDriverLocation', { lat, lng, rideId });
  }

  /** Rider's live position mid-ride, so the driver can see it too. */
  updateRiderLocation(lat: number, lng: number, rideId: string) {
    if (this.socket) this.socket.emit('updateRiderLocation', { lat, lng, rideId });
  }

  joinOrderRoom(orderId: string) {
    if (this.socket) {
      this.socket.emit('joinOrderRoom', orderId);
    }
  }

  updateOrderLocation(lat: number, lng: number, orderId: string) {
    if (this.socket) {
      this.socket.emit('updateOrderLocation', { lat, lng, orderId });
    }
  }

  onOrderLocationUpdated(handler: (payload: { lat: number; lng: number; orderId: string }) => void) {
    this.socket?.on('orderLocationUpdated', handler);
  }

  offOrderLocationUpdated() {
    this.socket?.off('orderLocationUpdated');
  }
}

export const rideSocket = new RideSocketService();

