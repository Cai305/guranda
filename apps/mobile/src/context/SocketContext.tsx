import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../utils/api';
import type { UserStatus, PresenceEvent } from '@mxit2/types';

// What the current user is doing right now — set by screens like the
// video player, live stream, and story viewer while they're focused, and
// cleared when the user leaves. A non-null activity forces the broadcast
// presence to 'busy' regardless of the user's manually-picked status
// (away/online/etc), the same way a phone call overrides "available".
export interface LiveActivity {
  type: 'video' | 'live' | 'story';
  label: string;
}

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Record<string, UserStatus>;
  // Only populated for a userId when THAT user has opted into sharing
  // live activity — everyone else just shows up as plain 'busy' above.
  activityLabels: Record<string, string | null>;
  setActivity: (activity: LiveActivity | null) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: {},
  activityLabels: {},
  setActivity: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatus>>({});
  const [activityLabels, setActivityLabels] = useState<Record<string, string | null>>({});
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [sound, setSound] = useState<AudioPlayer | null>(null);

  // A live/video/story activity always reads as "busy" to everyone else,
  // on top of whatever status the user manually picked.
  const broadcastStatus: UserStatus = activity ? 'busy' : status;

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

    const newSocket = io(API_BASE_URL, { transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      // Announce initial status
      newSocket.emit('set_status', {
        userId: user.userId,
        status: broadcastStatus,
        activityLabel: user.shareLiveActivity ? activity?.label ?? null : null,
      });
      // Request initial list
      newSocket.emit('get_online_users');
    });

    newSocket.on('online_users_list', (users: { userId: string, status: UserStatus, activityLabel?: string | null }[]) => {
      const map: Record<string, UserStatus> = {};
      const labels: Record<string, string | null> = {};
      users.forEach(u => { map[u.userId] = u.status; labels[u.userId] = u.activityLabel ?? null; });
      setOnlineUsers(map);
      setActivityLabels(labels);
    });

    newSocket.on('user_status_changed', (event: PresenceEvent) => {
      setOnlineUsers(prev => ({
        ...prev,
        [event.userId]: event.status,
      }));
      setActivityLabels(prev => ({
        ...prev,
        [event.userId]: event.status === 'offline' ? null : (event.activityLabel ?? null),
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

  // A backgrounded/closed app should read as offline right away, not
  // linger "online" until the OS eventually tears down the TCP connection
  // on its own schedule (which can take minutes). Explicitly disconnecting
  // on background triggers the server's normal disconnect handling —
  // broadcasting 'offline' and, once no other device is still connected,
  // writing lastSeenAt — the same as any other disconnect.
  useEffect(() => {
    if (!socket) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!socket.connected) socket.connect();
      } else {
        socket.disconnect();
      }
    });
    return () => sub.remove();
  }, [socket]);

  // Sync status changes — including automatic 'busy' while a live
  // activity (video/live/story) is active, and the activity label itself
  // when the user has opted into sharing it.
  useEffect(() => {
    if (socket && user && broadcastStatus) {
      socket.emit('set_status', {
        userId: user.userId,
        status: broadcastStatus,
        activityLabel: user.shareLiveActivity ? activity?.label ?? null : null,
      });
    }
  }, [broadcastStatus, activity, socket, user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, activityLabels, setActivity }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
