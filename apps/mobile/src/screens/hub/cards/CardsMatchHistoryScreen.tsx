import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuth } from '../../../context/AuthContext';
import { fetchApi } from '../../../utils/api';

export default function CardsMatchHistoryScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchApi('/cards/mine/history')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => Array.isArray(data) && setGames(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    },
    mode: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    resultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
    wonBadge: { backgroundColor: 'rgba(52,211,153,0.2)' },
    lostBadge: { backgroundColor: 'rgba(248,113,113,0.2)' },
    resultText: { fontSize: 10, fontWeight: '800', color: COLORS.text },
  }));

  const renderItem = ({ item }: { item: any }) => {
    const seats = item.seats as any[];
    const mySeat = seats.findIndex((s) => s.userId === user?.userId);
    const won = item.winnerSeat === mySeat || (item.winnerTeam !== null && seats[mySeat]?.team === item.winnerTeam);
    const opponents = seats.filter((_, i) => i !== mySeat).map((s) => s.displayName).join(', ');

    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CardsReplayViewer', { gameId: item.id })}>
        <View style={{ flex: 1 }}>
          <Text style={styles.mode}>{item.mode === 'FIVE_CARDS' ? '5 Cards' : 'Cassino'} vs {opponents}</Text>
          <Text style={styles.meta}>{new Date(item.updatedAt).toLocaleString()}{item.wager > 0 ? ` · ${item.wager} MSH` : ''}</Text>
        </View>
        <View style={[styles.resultBadge, won ? styles.wonBadge : styles.lostBadge]}>
          <Text style={styles.resultText}>{won ? 'WIN' : 'LOSS'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Match History</Text>
        <View style={{ width: 36 }} />
      </View>
      <FlatList
        data={games}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No finished games yet.</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}
