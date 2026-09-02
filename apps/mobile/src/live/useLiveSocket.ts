import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import type { LiveSoundType } from './useLiveSound';

// Real-time chat/reactions for a live room, over the same
// Socket.IO server used for regular chat (namespaced /live so
// event names never collide). Works on every platform — only the
// video path is web-only, this is plain WebSocket messaging.

export interface LiveChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  text: string;
  ts: number;
  // Extended message types
  msgType?: 'text' | 'emoji' | 'gif';
  emojiType?: LiveSoundType;  // only when msgType === 'emoji'
  gifUrl?: string;               // only when msgType === 'gif'
}

// Payload for sending special messages (senderName/id/ts added by hook)
export type LiveSpecialMessagePayload = {
  text: string;
  msgType: 'emoji';
  emojiType: LiveSoundType;
} | {
  text?: string;
  msgType: 'gif';
  gifUrl: string;
};

export interface LiveGiftEvent {
  giftType: string;
  icon: string;
  label: string;
  amount: number;
  senderName: string;
  message: string | null;
  nonce: number;
}

export interface LiveAudioRoomEvent {
  type: 'raise_hand' | 'lower_hand' | 'allocate_time';
  payload: any;
  ts: number;
}

export interface LiveParticipant {
  userId: string;
  username: string;
}

// roomName, my display name, and (for the moderation roster + mute/kick
// targeting) my real userId — undefined is fine for mock/simulated rooms,
// they just won't get a roster entry.
export function useLiveSocket(roomName: string | undefined, myName: string, myUserId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [lastReaction, setLastReaction] = useState<{ emoji: string; nonce: number } | null>(null);
  const [lastGift, setLastGift] = useState<LiveGiftEvent | null>(null);
  const [roomEnded, setRoomEnded] = useState(false);
  const [lastSpecialMsg, setLastSpecialMsg] = useState<LiveChatMessage | null>(null);
  const [kicked, setKicked] = useState<'kicked' | 'banned' | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);

  // Audio Room State
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [speakers, setSpeakers] = useState<Record<string, { timerEnd: number }>>({});

  // Category feature events (Shopping/Food/Gaming/Education/
  // Entertainment/Sports/Career/moderation updates). Each carries its own
  // payload shape; consumers read whichever ones their category
  // cares about and ignore the rest.
  const [categoryEvent, setCategoryEvent] = useState<{ type: string; payload: any; nonce: number } | null>(null);

  useEffect(() => {
    if (!roomName) return;
    const socket = io(`${API_BASE_URL}/live`);
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join_live_room', { roomName, userId: myUserId, username: myName }));
    socket.on('live_chat_message', (msg: LiveChatMessage) => {
      setMessages(prev => [...prev, msg]);
      // Trigger sound cue for incoming special emoji messages
      if (msg.msgType === 'emoji') setLastSpecialMsg({ ...msg, ts: Date.now() });
    });
    socket.on('live_chat_message_deleted', (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });
    socket.on('live_reaction', (data: { emoji: string }) =>
      setLastReaction({ emoji: data.emoji, nonce: Date.now() }));
    socket.on('live_gift', (gift: Omit<LiveGiftEvent, 'nonce'>) =>
      setLastGift({ ...gift, nonce: Date.now() }));
    socket.on('live_room_ended', () => setRoomEnded(true));
    socket.on('live_kicked', (data: { reason: 'kicked' | 'banned' }) => setKicked(data.reason));
    socket.on('live_participants_update', (data: { participants: LiveParticipant[] }) =>
      setParticipants(data.participants));

    socket.on('live_audio_room_event', (event: LiveAudioRoomEvent) => {
      if (event.type === 'raise_hand') {
        setRaisedHands(prev => {
          if (!prev.includes(event.payload.username)) return [...prev, event.payload.username];
          return prev;
        });
      } else if (event.type === 'lower_hand') {
        setRaisedHands(prev => prev.filter(u => u !== event.payload.username));
      } else if (event.type === 'allocate_time') {
        // payload: { username: string, durationMs: number }
        setSpeakers(prev => ({
          ...prev,
          [event.payload.username]: { timerEnd: Date.now() + event.payload.durationMs }
        }));
        // Auto lower hand when promoted
        setRaisedHands(prev => prev.filter(u => u !== event.payload.username));
      }
    });

    const categoryEvents = [
      'live_pinned_product', 'live_pinned_food', 'live_linked_game', 'live_score_update',
      'live_quiz_update', 'live_poll_update', 'live_prediction_update', 'live_job_posted', 'live_question_asked',
      'live_topic_update', 'live_showcase_update', 'live_dating_update', 'live_moderation_update',
      'live_guest_update', 'live_ride_status_update',
    ];
    categoryEvents.forEach(type => {
      socket.on(type, (payload: any) => setCategoryEvent({ type, payload, nonce: Date.now() }));
    });

    return () => {
      socket.emit('leave_live_room', { roomName, userId: myUserId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomName]);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.emit('live_chat_message', { roomName, senderId: myUserId, senderName: myName, text, msgType: 'text' });
  }, [roomName, myName, myUserId]);

  const sendSpecialMessage = useCallback((msg: LiveSpecialMessagePayload) => {
    socketRef.current?.emit('live_chat_message', {
      roomName,
      senderId: myUserId,
      senderName: myName,
      text: '',
      ...msg,
    });
  }, [roomName, myName, myUserId]);

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit('delete_chat_message', { roomName, messageId, userId: myUserId });
  }, [roomName, myUserId]);

  const sendReaction = useCallback((emoji: string) => {
    socketRef.current?.emit('live_reaction', { roomName, emoji });
  }, [roomName]);

  const sendAudioRoomEvent = useCallback((type: 'raise_hand' | 'lower_hand' | 'allocate_time', payload: any) => {
    socketRef.current?.emit('live_audio_room_event', { roomName, type, payload });
  }, [roomName]);

  return {
    messages,
    sendMessage,
    sendSpecialMessage,
    deleteMessage,
    sendReaction,
    lastReaction,
    lastGift,
    lastSpecialMsg,
    roomEnded,
    kicked,
    participants,
    categoryEvent,
    raisedHands,
    speakers,
    sendAudioRoomEvent
  };
}
