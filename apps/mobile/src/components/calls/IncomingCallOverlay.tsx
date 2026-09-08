import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../navigation/navigationRef';

interface IncomingCall {
  callId: string;
  roomName: string;
  wsUrl: string;
  token: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string | null;
  video: boolean;
}

interface IncomingGroupCall {
  callId: string;
  roomName: string;
  wsUrl: string;
  token: string;
  callerId: string;
  callerName: string;
  chatId: string;
  chatName?: string | null;
  video: boolean;
}

// Mounted once at the app root (same pattern as AiFloatingOrb) so a call can
// ring in no matter which screen the user is currently on.
export default function IncomingCallOverlay() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [incomingGroup, setIncomingGroup] = useState<IncomingGroupCall | null>(null);
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center', alignItems: 'center',
      zIndex: 1000,
    },
    card: {
      width: '85%', maxWidth: 340,
      backgroundColor: COLORS.surfaceElevated || COLORS.surface,
      borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder || COLORS.border,
      padding: SPACING.xl || 28,
      alignItems: 'center',
    },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.surface },
    name: { ...TYPOGRAPHY.h2, marginTop: 14 },
    subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 4, marginBottom: 24 },
    actions: { flexDirection: 'row', gap: 40 },
    actionBtn: {
      width: 60, height: 60, borderRadius: 30,
      justifyContent: 'center', alignItems: 'center',
    },
    declineBtn: { backgroundColor: '#EF4444' },
    acceptBtn: { backgroundColor: '#22C55E' },
  }));

  useEffect(() => {
    if (!socket) return;
    const onIncoming = (call: IncomingCall) => setIncoming(call);
    // If the caller hangs up/times out before we answer, dismiss the ring UI.
    const onEnded = (data: { callId: string }) => {
      setIncoming(prev => (prev?.callId === data.callId ? null : prev));
    };
    const onGroupIncoming = (call: IncomingGroupCall) => setIncomingGroup(call);
    const onGroupEnded = (data: { callId: string }) => {
      setIncomingGroup(prev => (prev?.callId === data.callId ? null : prev));
    };
    socket.on('call_incoming', onIncoming);
    socket.on('call_ended', onEnded);
    socket.on('group_call_incoming', onGroupIncoming);
    socket.on('group_call_ended', onGroupEnded);
    return () => {
      socket.off('call_incoming', onIncoming);
      socket.off('call_ended', onEnded);
      socket.off('group_call_incoming', onGroupIncoming);
      socket.off('group_call_ended', onGroupEnded);
    };
  }, [socket]);

  if (!incoming && !incomingGroup) return null;

  const accept = () => {
    if (!incoming) return;
    socket?.emit('call_accept', { callId: incoming.callId });
    navigate('CallScreen', {
      callId: incoming.callId,
      roomName: incoming.roomName,
      wsUrl: incoming.wsUrl,
      token: incoming.token,
      video: incoming.video,
      peerName: incoming.callerName,
      peerAvatarUrl: incoming.callerAvatarUrl,
      isCaller: false,
    });
    setIncoming(null);
  };

  const decline = () => {
    if (!incoming) return;
    socket?.emit('call_decline', { callId: incoming.callId });
    setIncoming(null);
  };

  const acceptGroup = () => {
    if (!incomingGroup || !user?.userId) return;
    socket?.emit('group_call_join', { callId: incomingGroup.callId, userId: user.userId });
    navigate('GroupCallScreen', {
      callId: incomingGroup.callId,
      roomName: incomingGroup.roomName,
      wsUrl: incomingGroup.wsUrl,
      token: incomingGroup.token,
      video: incomingGroup.video,
      chatName: incomingGroup.chatName,
      isCaller: false,
      userId: user.userId,
    });
    setIncomingGroup(null);
  };

  const declineGroup = () => {
    if (!incomingGroup || !user?.userId) return;
    socket?.emit('group_call_decline', { callId: incomingGroup.callId, userId: user.userId });
    setIncomingGroup(null);
  };

  const call = incoming
    ? {
        avatarUrl: incoming.callerAvatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${incoming.callerName}`,
        title: incoming.callerName,
        subtitle: `Incoming ${incoming.video ? 'video' : 'voice'} call…`,
        onAccept: accept,
        onDecline: decline,
      }
    : incomingGroup
      ? {
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=${incomingGroup.chatName || incomingGroup.callerName}`,
          title: incomingGroup.chatName || 'Group call',
          subtitle: `${incomingGroup.callerName} started a ${incomingGroup.video ? 'video' : 'voice'} call…`,
          onAccept: acceptGroup,
          onDecline: declineGroup,
        }
      : null;
  if (!call) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Image source={{ uri: call.avatarUrl }} style={styles.avatar} />
        <Text style={styles.name}>{call.title}</Text>
        <Text style={styles.subtitle}>{call.subtitle}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={call.onDecline}>
            <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={call.onAccept}>
            <Ionicons name="call" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
