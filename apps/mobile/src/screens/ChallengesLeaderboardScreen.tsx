import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../theme';
import { fetchApi } from '../utils/api';

const CATEGORIES = [
  null, 'DANCE', 'COMEDY', 'FITNESS', 'GAMING', 'PHOTOGRAPHY', 'COOKING',
  'BUSINESS', 'MUSIC', 'LIFESTYLE', 'SPORTS', 'COUPLES', 'SPONSORED',
];

export default function ChallengesLeaderboardScreen({ navigation }: any) {
  const [category, setCategory] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const qs = category ? `?category=${category}` : '';
      fetchApi(`/leaderboard/challenges${qs}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => Array.isArray(data) && setRows(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [category]),
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Leaderboard</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item ?? 'all'}
        contentContainerStyle={styles.categoryRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
              {item ? item.charAt(0) + item.slice(1).toLowerCase() : 'Overall'}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={rows}
        keyExtractor={(r, i) => r.id ?? r.userId ?? String(i)}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        renderItem={({ item, index }) => {
          const displayName = item.user?.profile?.displayName || item.user?.username || 'Player';
          const avatarUrl = item.user?.profile?.avatarUrl || item.user?.avatarUrl;
          return (
            <View style={styles.row}>
              <Text style={styles.rank}>#{index + 1}</Text>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Ionicons name="person-circle" size={26} color={COLORS.textMuted} />
              )}
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.xp}>{item.xp} XP</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No one's earned XP here yet.</Text>}
          </View>
        }
      />
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
  categoryRow: { paddingHorizontal: SPACING.lg, gap: 8, paddingBottom: SPACING.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.xs,
  },
  rank: { color: COLORS.gold, fontWeight: '800', width: 32 },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surface },
  name: { flex: 1, color: COLORS.text, fontWeight: '600' },
  xp: { color: COLORS.gold, fontWeight: '800' },
});
