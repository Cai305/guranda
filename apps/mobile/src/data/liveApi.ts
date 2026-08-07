import { fetchApi } from '../utils/api';
import { LiveStream, LiveCreator } from './mockLiveStreams';

// Real backend integration for Guranda Live, layered on top of the
// mock catalog (mockLiveStreams.ts) so discover always has rich
// content even when no one is actually broadcasting.

export interface RealLiveStream extends LiveStream {
  real: true;
  roomId: string;
  roomName: string;
}

interface ApiLiveRoom {
  id: string;
  roomName: string;
  title: string;
  categoryId: string;
  hostId: string;
  isLive: boolean;
  startedAt: string;
  host?: {
    id: string;
    username: string;
    profile?: { displayName?: string | null; avatarUrl?: string | null } | null;
  };
}

const CATEGORY_TO_TAG: Record<string, string> = {
  social: 'Trending',
  shopping: 'Shopping',
  business: 'Business',
  gaming: 'Gaming',
  education: 'Education',
  entertainment: 'Entertainment',
  sports: 'Sports',
  food: 'Food',
  ride: 'Nearby',
  career: 'Business',
};

function toLiveStream(room: ApiLiveRoom): RealLiveStream {
  const hostName = room.host?.profile?.displayName || room.host?.username || 'Guranda Creator';
  const creator: LiveCreator = {
    id: room.hostId,
    name: hostName,
    avatarSeed: room.host?.username || room.hostId,
    verified: false,
    followers: 0,
    following: 0,
    totalViews: 0,
    totalLikes: 0,
    watchTimeHours: 0,
    badges: [],
    categoryIds: [room.categoryId],
  };

  return {
    id: room.id,
    title: room.title,
    categoryId: room.categoryId,
    tags: ['All', CATEGORY_TO_TAG[room.categoryId] || 'Trending'],
    viewers: 1,
    creator,
    real: true,
    roomId: room.id,
    roomName: room.roomName,
  };
}

export async function fetchLiveRooms(): Promise<RealLiveStream[]> {
  try {
    const res = await fetchApi('/live/rooms');
    if (!res.ok) return [];
    const rooms: ApiLiveRoom[] = await res.json();
    return rooms.map(toLiveStream);
  } catch {
    return [];
  }
}

export async function goLive(title: string, categoryId: string, conversationTopic?: string) {
  const res = await fetchApi('/live/rooms', {
    method: 'POST',
    body: JSON.stringify({ title, categoryId, conversationTopic }),
  });
  if (!res.ok) throw new Error('Failed to start your stream. Please try again.');
  return res.json() as Promise<{
    id: string; roomName: string; title: string; categoryId: string; token: string; wsUrl: string;
  }>;
}

export async function joinRoom(roomId: string) {
  const res = await fetchApi(`/live/rooms/${roomId}/join`, { method: 'POST' });
  if (!res.ok) throw new Error('This stream is no longer available.');
  return res.json() as Promise<{
    roomName: string; token: string; wsUrl: string; isHost: boolean; title: string; categoryId: string;
  }>;
}

// Shared entry point for tapping a live tile anywhere in the app (Home,
// Live feed, etc.) — routes the host straight back into their own studio
// instead of the read-only viewer screen when the stream is theirs.
export async function enterLiveStream(stream: LiveStream, currentUserId: string | undefined, navigation: any) {
  const real = stream as RealLiveStream;
  if (real.real && currentUserId && stream.creator.id === currentUserId) {
    try {
      const room = await joinRoom(real.roomId);
      if (room.isHost) {
        navigation.navigate('LiveHost', {
          roomId: real.roomId,
          roomName: room.roomName,
          token: room.token,
          wsUrl: room.wsUrl,
          title: room.title,
          categoryId: room.categoryId,
          guestCount: 0,
          moderatorsOn: false,
        });
        return;
      }
    } catch {
      // fall through to the viewer experience below
    }
  }
  navigation.navigate('LiveViewer', { stream });
}

export async function endRoom(roomId: string) {
  const res = await fetchApi(`/live/rooms/${roomId}/end`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to end the stream.');
  return res.json();
}
