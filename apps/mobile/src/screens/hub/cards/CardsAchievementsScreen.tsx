import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

export default function CardsAchievementsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    badge: {
      flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 6, marginBottom: SPACING.sm,
    },
    badgeLocked: { opacity: 0.5 },
    badgeName: { color: COLORS.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
    badgeDesc: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  }));
  const [all, setAll] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        fetchApi('/achievements').then((r) => (r.ok ? r.json() : [])),
        fetchApi('/achievements/mine').then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([allRes, mineRes]) => {
          setAll(Array.isArray(allRes) ? allRes : []);
          setMine(Array.isArray(mineRes) ? mineRes : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  const unlockedIds = new Set(mine.map((m) => m.achievementId));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Achievements</Text>
        <View style={{ width: 36 }} />
      </View>
      <FlatList
        data={all}
        keyExtractor={(a) => a.id}
        numColumns={2}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: SPACING.sm }}
        renderItem={({ item }) => {
          const unlocked = unlockedIds.has(item.id);
          return (
            <View style={[styles.badge, !unlocked && styles.badgeLocked]}>
              <Ionicons name={unlocked ? 'ribbon' : 'lock-closed'} size={28} color={unlocked ? COLORS.gold : COLORS.textMuted} />
              <Text style={styles.badgeName}>{item.name}</Text>
              <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            {loading && <ActivityIndicator color={COLORS.primary} />}
          </View>
        }
      />
    </SafeAreaView>
  );
}
