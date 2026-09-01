import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatComposer from '../../components/chat/ChatComposer';
import { LinearGradient } from 'expo-linear-gradient';
import io, { Socket } from 'socket.io-client';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

// A MoonBase room: your avatar hangs out with everyone else in a starry
// scene, with live chat below and one-tap game challenges.

interface MoonMember {
  userId: string;
  name: string;
  avatarUrl: string;
}

interface MoonMessage {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string;
  text: string;
  at: number;
}

const GAME_CHIPS = [
  { label: '🐄 Murabaraba', route: 'MurabarabaLobby' },
  { label: '🎲 Ludo', route: 'LudoLobby' },
  { label: '♟️ Chess', route: 'ChessLobby' },
];

// Deterministic scatter positions for avatars in the scene (percentages)
const SLOTS = [
  { left: 38, top: 42 }, { left: 12, top: 25 }, { left: 66, top: 20 },
  { left: 80, top: 48 }, { left: 22, top: 58 }, { left: 52, top: 12 },
  { left: 5, top: 45 }, { left: 62, top: 55 },
];

export default function MoonRoomScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { SPACING, GRADIENTS } = theme;
  const { roomId, roomName, emoji } = route.params || {};
  const { user } = useAuth();
  const [members, setMembers] = useState<MoonMember[]>([]);
  const [messages, setMessages] = useState<MoonMessage[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let sock: Socket | null = null;
    (async () => {
      // Use the saved custom avatar if there is one
      let avatarUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.username || 'moon'}`;
      try {
        const res = await fetchApi('/users/me');
        if (res.ok) {
          const p = await res.json();
          if (p?.avatarUrl) avatarUrl = p.avatarUrl;
        }
      } catch {}

      sock = io(`${API_BASE_URL}/moonbase`);
      socketRef.current = sock;

      sock.on('moon_joined', (data: { members: MoonMember[]; messages: MoonMessage[] }) => {
        setMembers(data.members);
        setMessages(data.messages);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
      });
      sock.on('moon_presence', (data: { members: MoonMember[] }) => setMembers(data.members));
      sock.on('moon_message', (msg: MoonMessage) => {
        setMessages(prev => [...prev.slice(-60), msg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      });

      sock.emit('moon_join', {
        roomId,
        userId: user?.userId,
        name: user?.displayName || user?.username || 'Moonwalker',
        avatarUrl,
      });
    })();

    return () => {
      sock?.emit('moon_leave');
      sock?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    socketRef.current?.emit('moon_message', { roomId, text });
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#0A0618' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
    headerSub: { color: COLORS.success, fontSize: 11, marginTop: 2 },
    scene: {
      height: 210,
      marginHorizontal: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
      overflow: 'hidden',
    },
    star: {
      position: 'absolute',
      width: 2.5, height: 2.5, borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.7)',
    },
    moonSurface: {
      position: 'absolute', bottom: -60, left: -40, right: -40,
      height: 100,
      borderRadius: 100,
      backgroundColor: 'rgba(200,200,220,0.12)',
    },
    sceneMember: { position: 'absolute', alignItems: 'center', width: 64 },
    sceneAvatar: {
      width: 46, height: 46, borderRadius: 23,
      borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.9)',
      backgroundColor: '#1B0E45',
    },
    sceneName: {
      color: 'rgba(255,255,255,0.85)', fontSize: 9.5, marginTop: 3,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5,
      overflow: 'hidden',
    },
    sceneEmpty: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 90 },
    gamesBar: { marginTop: SPACING.md, maxHeight: 40 },
    gameChip: {
      backgroundColor: 'rgba(139,92,246,0.15)',
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)',
      borderRadius: RADIUS.pill,
      paddingVertical: 8, paddingHorizontal: 14,
    },
    gameChipText: { color: COLORS.text, fontWeight: '700', fontSize: 12.5 },
    msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1B0E45' },
    msgBubble: {
      maxWidth: '75%',
      backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg,
      borderBottomLeftRadius: 4,
      padding: 10,
    },
    msgBubbleMine: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
      borderBottomLeftRadius: RADIUS.lg,
      borderBottomRightRadius: 4,
    },
    msgName: { color: COLORS.primary, fontSize: 10.5, fontWeight: '800', marginBottom: 2 },
    msgText: { color: COLORS.text, fontSize: 13.5, lineHeight: 18 },
    inputRow: {
      flexDirection: 'row', gap: 10, alignItems: 'center',
      padding: SPACING.lg, paddingTop: 6,
    },
    input: {
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      color: COLORS.text,
      paddingHorizontal: 16, paddingVertical: 10,
      fontSize: 14,
    },
    sendBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
    },
  }));

  const renderMessage = ({ item }: { item: MoonMessage }) => {
    const mine = item.userId === user?.userId;
    return (
      <View style={[styles.msgRow, mine && { flexDirection: 'row-reverse' }]}>
        <Image source={{ uri: item.avatarUrl }} style={styles.msgAvatar} />
        <View style={[styles.msgBubble, mine && styles.msgBubbleMine]}>
          {!mine && <Text style={styles.msgName}>{item.name}</Text>}
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'moonbase',
            label: roomName || 'MoonBase',
            icon: 'planet',
            gradient: GRADIENTS.sunset,
            route: { name: 'MoonRoom', params: { roomId, roomName, emoji } },
          }}
        />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{emoji} {roomName}</Text>
          <Text style={styles.headerSub}>{members.length} in the room</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* The scene: avatars hanging out under the stars */}
      <LinearGradient colors={['#1B0E45', '#0A0618']} style={styles.scene}>
        {[...Array(14)].map((_, i) => (
          <View
            key={`s${i}`}
            style={[styles.star, { left: `${(i * 47) % 100}%`, top: `${(i * 29) % 92}%` }]}
          />
        ))}
        <View style={styles.moonSurface} />
        {members.slice(0, SLOTS.length).map((m, i) => (
          <View
            key={`${m.userId}-${i}`}
            style={[styles.sceneMember, { left: `${SLOTS[i].left}%`, top: `${SLOTS[i].top}%` }]}
          >
            <Image source={{ uri: m.avatarUrl }} style={styles.sceneAvatar} />
            <Text style={styles.sceneName} numberOfLines={1}>{m.name}</Text>
          </View>
        ))}
        {members.length === 0 && (
          <Text style={styles.sceneEmpty}>Beaming you down…</Text>
        )}
      </LinearGradient>

      {/* Mini-games inside the room */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gamesBar} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg }}>
        {GAME_CHIPS.map(g => (
          <TouchableOpacity key={g.route} style={styles.gameChip} onPress={() => navigation.navigate(g.route)}>
            <Text style={styles.gameChipText}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: SPACING.lg, gap: 8 }}
        />
        <ChatComposer
          value={input}
          onChangeText={setInput}
          onSend={send}
          placeholder={`Say something in ${roomName}…`}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
