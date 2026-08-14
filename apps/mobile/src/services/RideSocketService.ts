import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class RideSocketService {
  public socket: Socket | null = null;
  private connectPromise: Promise<Socket | null> | null = null;

  /**
   * Returns a promise that resolves once the socket is connected.
   * Subsequent calls return the same promise (idempotent).
   */
  async connect(): Promise<Socket | null> {
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<Socket | null>(async (resolve) => {
      try {
        let token: string | null = null;
        if (Platform.OS === 'web') {
          try { token = localStorage.getItem('userToken'); } catch {}
        } else {
          token = await SecureStore.getItemAsync('userToken');
        }

        if (!token) {
          console.warn('RideSocket: no auth token, skipping connect');
          resolve(null);
          return;
        }

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

