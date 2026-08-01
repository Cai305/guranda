import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Share, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../utils/api';

interface ChatEntry {
  kind: 'message' | 'reaction';
  displayName: string;
  content: string;
  at: number;
}

export default function CardRoomScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { roomId: initialRoomId, roomCode, mode: initialMode } = route.params ?? {};
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(initialRoomId ?? null);
  const [room, setRoom] = useState<any>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [message, setMessage] = useState('');
  const displayName = user?.displayName || user?.username || 'Player';
  const chatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    const sock = io(`${API_BASE_URL}/cards`);
    setSocket(sock);

    sock.on('connect', () => {
      if (initialRoomId) {
        sock.emit('join_room', { roomId: initialRoomId, userId: user.userId, displayName, avatarUrl: user.avatarUrl });
      } else if (roomCode) {
        sock.emit('join_room_by_code', { roomCode, userId: user.userId, displayName, avatarUrl: user.avatarUrl });
      }
    });
    sock.on('room_joined', (data: { roomId: string }) => {
      setRoomId(data.roomId);
      sock.emit('join_room', { roomId: data.roomId, userId: user.userId, displayName, avatarUrl: user.avatarUrl });
    });
    sock.on('room_updated', (data: any) => setRoom(data));
    sock.on('room_game_started', (data: { gameId: string }) => {
      const targetMode = room?.mode ?? initialMode;
      navigation.replace(targetMode === 'CASSINO' ? 'CassinoGame' : 'FiveCardsGame', {
        gameId: data.gameId,
        participants: room?.participants,
      });
    });
    sock.on('room_message', (data: any) => {
      setChat((c) => [...c, { kind: 'message', displayName: data.displayName, content: data.content, at: data.at }]);
    });
    sock.on('room_reaction', (data: any) => {
      setChat((c) => [...c, { kind: 'reaction', displayName: '', content: data.emoji, at: data.at }]);
    });
    sock.on('invalid_action', (data: { reason: string }) => console.warn('invalid_action', data.reason));

    return () => { sock.disconnect(); };
  }, [user?.userId]);

  const isHost = room && user && room.hostId === user.userId;
  const canStart = (room?.participants?.length ?? 0) >= 2;

  const startGame = () => {
    if (!roomId || !user) return;
    socket?.emit('start_room_game', { roomId, hostId: user.userId });
  };

  const sendMessage = () => {
    if (!message.trim() || !roomId || !user) return;
    socket?.emit('send_room_message', { roomId, userId: user.userId, displayName, content: message.trim() });
    setMessage('');
  };

  const sendReaction = (emoji: string) => {
    if (!roomId || !user) return;
    socket?.emit('send_reaction', { roomId, userId: user.userId, emoji });
  };

  const shareRoom = () => {
    if (!room) return;
    Share.share({
      message: `Join my ${room.mode === 'CASSINO' ? 'Cassino' : '5 Cards'} game on Guranda! Room code: ${room.roomCode}\nguranda://cards/join/${room.roomCode}`,
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>{room?.mode === 'CASSINO' ? 'Cassino' : '5 Cards'} Room</Text>
        <TouchableOpacity style={styles.backBtn} onPress={shareRoom}>
          <Ionicons name="share-social" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {roomId && (
        <TouchableOpacity
          style={styles.inviteFriendBtn}
          onPress={() => navigation.navigate('FriendsList', { pickForRoomId: roomId })}
        >
          <Ionicons name="person-add" size={16} color={COLORS.primary} />
          <Text style={styles.inviteFriendText}>Invite a friend</Text>
        </TouchableOpacity>
      )}

      {room && (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Room Code</Text>
          <Text style={styles.codeValue}>{room.roomCode}</Text>
          <Text style={styles.codeMeta}>{room.isPrivate ? 'Private' : 'Public'} · {room.maxSeats} seats</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Players ({room?.participants?.length ?? 0}/{room?.maxSeats ?? '-'})</Text>
      <FlatList
        data={room?.participants ?? []}
        keyExtractor={(p) => p.userId}
        horizontal
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.sm }}
        renderItem={({ item }) => (
          <View style={styles.participantChip}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.participantAvatar} />
            ) : (
              <Ionicons name="person-circle" size={18} color={COLORS.primary} />
            )}
            <Text style={styles.participantName}>{item.displayName}{item.userId === room?.hostId ? ' (host)' : ''}</Text>
          </View>
        )}
      />

      {isHost && (
        <TouchableOpacity style={[styles.startBtn, !canStart && styles.startBtnDisabled]} onPress={startGame} disabled={!canStart}>
          <Text style={styles.startBtnText}>{canStart ? 'Start Game' : 'Need at least 2 players'}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.chatArea}>
        <FlatList
          ref={chatListRef}
          data={chat}
          keyExtractor={(_, i) => String(i)}
          onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) =>
            item.kind === 'reaction' ? (
              <Text style={styles.reactionLine}>{item.content}</Text>
            ) : (
              <Text style={styles.chatLine}><Text style={styles.chatName}>{item.displayName}: </Text>{item.content}</Text>
            )
          }
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }}
        />
        <View style={styles.reactionRow}>
          {['😂', '🔥', '👏', '❤️', '😲'].map((emoji) => (
            <TouchableOpacity key={emoji} onPress={() => sendReaction(emoji)}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something…"
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  inviteFriendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    paddingVertical: 8, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  inviteFriendText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  codeCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center',
  },
  codeLabel: { ...TYPOGRAPHY.label },
  codeValue: { color: COLORS.gold, fontWeight: '900', fontSize: 28, letterSpacing: 3 },
  codeMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  sectionLabel: { ...TYPOGRAPHY.label, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  participantChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8,
  },
  participantName: { color: COLORS.text, fontWeight: '600', fontSize: 12 },
  participantAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.surface },
  startBtn: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontWeight: '800' },
  chatArea: { flex: 1, marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.glassBorder },
  chatLine: { color: COLORS.text, fontSize: 13, marginBottom: 4 },
  chatName: { fontWeight: '700', color: COLORS.primary },
  reactionLine: { fontSize: 20, marginBottom: 4 },
  reactionRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs },
  reactionEmoji: { fontSize: 22 },
  chatInputRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  chatInput: {
    flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, color: COLORS.text,
  },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
