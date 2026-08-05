import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

type Mode = 'FIVE_CARDS' | 'CASSINO';

export default function CardsLeaderboardScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [mode, setMode] = useState<Mode>('FIVE_CARDS');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchApi(`/leaderboard/cards?mode=${mode}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => Array.isArray(data) && setRows(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [mode]),
  );

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    tabRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    tab: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder, alignItems: 'center' },
    tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { color: COLORS.textMuted, fontWeight: '700' },
    tabTextActive: { color: '#fff' },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.xs,
    },
    rank: { color: COLORS.gold, fontWeight: '800', width: 32 },
    avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surface },
    name: { flex: 1, color: COLORS.text, fontWeight: '600' },
    rating: { color: COLORS.primary, fontWeight: '800', marginRight: SPACING.sm },
    stat: { color: COLORS.textMuted, fontSize: 12 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Leaderboard</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, mode === 'FIVE_CARDS' && styles.tabActive]} onPress={() => setMode('FIVE_CARDS')}>
          <Text style={[styles.tabText, mode === 'FIVE_CARDS' && styles.tabTextActive]}>5 Cards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode === 'CASSINO' && styles.tabActive]} onPress={() => setMode('CASSINO')}>
          <Text style={[styles.tabText, mode === 'CASSINO' && styles.tabTextActive]}>Cassino</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            {item.user?.profile?.avatarUrl ? (
              <Image source={{ uri: item.user.profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle" size={26} color={COLORS.textMuted} />
            )}
            <Text style={styles.name} numberOfLines={1}>{item.user?.profile?.displayName || item.user?.username}</Text>
            <Text style={styles.rating}>{item.rating}</Text>
            <Text style={styles.stat}>{item.wins}W-{item.losses}L</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No ranked games yet.</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}
