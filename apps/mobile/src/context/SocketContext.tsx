import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../utils/api';
import type { UserStatus, PresenceEvent } from '@mxit2/types';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Record<string, UserStatus>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatus>>({});
  const [sound, setSound] = useState<AudioPlayer | null>(null);

  // Preload sound
  useEffect(() => {
    const player = createAudioPlayer(require('../../assets/notification.ogg'));
    setSound(player);

    return () => {
      player.remove();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      // Announce initial status
      newSocket.emit('set_status', { userId: user.userId, status });
      // Request initial list
      newSocket.emit('get_online_users');
    });

    newSocket.on('online_users_list', (users: { userId: string, status: UserStatus }[]) => {
      const map: Record<string, UserStatus> = {};
      users.forEach(u => map[u.userId] = u.status);
      setOnlineUsers(map);
    });

    newSocket.on('user_status_changed', (event: PresenceEvent) => {
      setOnlineUsers(prev => ({
        ...prev,
        [event.userId]: event.status,
      }));
    });

    // Listen for incoming messages globally and play notification
    newSocket.on('new_message', async (msg) => {
      // Don't play sound if we sent it
      if (msg.senderId !== user.userId && sound) {
        try {
          await sound.seekTo(0);
          sound.play();
        } catch (e) {
          console.log("Failed to play sound", e);
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, sound]);

  // Sync status changes
  useEffect(() => {
    if (socket && user && status) {
      socket.emit('set_status', { userId: user.userId, status });
    }
  }, [status, socket, user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
