import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL, fetchApi } from '../../../utils/api';
import SessionHeaderActions from '../../../components/SessionHeaderActions';

type CardGameMode = 'FIVE_CARDS' | 'CASSINO';

export default function CardsHomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } = theme;
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState<CardGameMode | null>(null);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    gameRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    gameTile: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
    gameTileGrad: { paddingVertical: 24, alignItems: 'center', gap: 8 },
    gameTileText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    linkBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8,
    },
    linkText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
    joinRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    joinInput: {
      flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, color: COLORS.text,
    },
    joinBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, justifyContent: 'center' },
    joinBtnText: { color: '#fff', fontWeight: '700' },
    createRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    createBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.pill, paddingVertical: 10,
    },
    createBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
    sectionLabel: { ...TYPOGRAPHY.label, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    roomCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    },
    roomMode: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    roomMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  }));

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/cards/rooms')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setRooms(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createRoom = (mode: CardGameMode) => {
    if (!user) return;
    setCreating(mode);
    const sock = io(`${API_BASE_URL}/cards`);
    sock.on('connect', () => {
      sock.emit('create_room', {
        hostId: user.userId,
        hostDisplayName: user.displayName || user.username,
        hostAvatarUrl: user.avatarUrl,
        mode,
        isPrivate: false,
        maxSeats: mode === 'CASSINO' ? 4 : 6,
        settings: mode === 'FIVE_CARDS' ? { jokersEnabled: false } : { targetScore: 11, cassinoMode: 'ONE_V_ONE' },
      });
    });
    sock.on('room_created', (data: { roomId: string; roomCode: string }) => {
      setCreating(null);
      sock.disconnect();
      navigation.navigate('CardRoom', { roomId: data.roomId, mode });
    });
  };

  const joinByCode = () => {
    if (!joinCode.trim()) return;
    navigation.navigate('CardRoom', { roomCode: joinCode.trim().toUpperCase() });
  };

  const renderRoom = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.roomCard} onPress={() => navigation.navigate('CardRoom', { roomId: item.id, mode: item.mode })}>
      <View style={{ flex: 1 }}>
        <Text style={styles.roomMode}>{item.mode === 'FIVE_CARDS' ? '5 Cards' : 'Cassino'}</Text>
        <Text style={styles.roomMeta}>Code {item.roomCode} · {item.maxSeats} seats</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{ id: 'cards', label: 'Card Games', icon: 'albums', gradient: GRADIENTS.emerald, route: { name: 'CardsHome' } }}
        />
        <Text style={TYPOGRAPHY.h2}>Card Games</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.gameRow}>
        <TouchableOpacity style={styles.gameTile} onPress={() => navigation.navigate('FiveCardsLobby')}>
          <LinearGradient colors={GRADIENTS.emerald} style={styles.gameTileGrad}>
            <Ionicons name="albums" size={28} color="#fff" />
            <Text style={styles.gameTileText}>5 Cards</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gameTile} onPress={() => navigation.navigate('CassinoLobby')}>
          <LinearGradient colors={GRADIENTS.golden} style={styles.gameTileGrad}>
            <Ionicons name="grid" size={28} color="#1E0A38" />
            <Text style={[styles.gameTileText, { color: '#1E0A38' }]}>Cassino</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.linkRow}>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('CardsLeaderboard')}>
          <Ionicons name="podium" size={16} color={COLORS.primary} />
          <Text style={styles.linkText}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('CardsTournamentList')}>
          <Ionicons name="trophy" size={16} color={COLORS.primary} />
          <Text style={styles.linkText}>Tournaments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('CardsDailyChallenges')}>
          <Ionicons name="calendar" size={16} color={COLORS.primary} />
          <Text style={styles.linkText}>Challenges</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('CardsAchievements')}>
          <Ionicons name="ribbon" size={16} color={COLORS.primary} />
          <Text style={styles.linkText}>Achievements</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('CardsMatchHistory')}>
          <Ionicons name="time" size={16} color={COLORS.primary} />
          <Text style={styles.linkText}>History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.joinRow}>
        <TextInput
          style={styles.joinInput}
          placeholder="Enter room code"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="characters"
          value={joinCode}
          onChangeText={setJoinCode}
        />
        <TouchableOpacity style={styles.joinBtn} onPress={joinByCode}>
          <Text style={styles.joinBtnText}>Join</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.createRow}>
        <TouchableOpacity style={styles.createBtn} onPress={() => createRoom('FIVE_CARDS')} disabled={!!creating}>
          {creating === 'FIVE_CARDS' ? <ActivityIndicator color={COLORS.text} /> : (
            <>
              <Ionicons name="add-circle" size={16} color={COLORS.text} />
              <Text style={styles.createBtnText}>Create 5 Cards Room</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.createBtn} onPress={() => createRoom('CASSINO')} disabled={!!creating}>
          {creating === 'CASSINO' ? <ActivityIndicator color={COLORS.text} /> : (
            <>
              <Ionicons name="add-circle" size={16} color={COLORS.text} />
              <Text style={styles.createBtnText}>Create Cassino Room</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Public Rooms</Text>
      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        renderItem={renderRoom}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No public rooms right now.</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}
