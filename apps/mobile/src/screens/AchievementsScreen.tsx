import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import EmptyState from '../components/EmptyState';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
}
interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
  achievement: Achievement;
}

// Derived from the code prefix — the backend's Achievement.criteria doesn't
// carry a category field, and every code already follows a consistent
// DOMAIN_thing naming convention (see achievements.service.ts), so this
// stays in sync automatically as new codes are added.
function categoryFor(code: string): string {
  if (code.startsWith('CARDS_') || code.startsWith('CASSINO_')) return 'Card Games';
  if (code.startsWith('CHALLENGE_')) return 'Challenges';
  if (code.startsWith('POSTS_')) return 'Posts';
  if (code.startsWith('SOCIAL_')) return 'Social';
  if (code.startsWith('LIVE_')) return 'Live Streaming';
  if (code.startsWith('GIFTS_')) return 'Gifts';
  if (code.startsWith('CHAT_')) return 'Chat';
  if (code.startsWith('RELATIONSHIP_')) return 'Relationships';
  return 'Other';
}
// Fixed display order — otherwise section order would depend on
// Achievement.createdAt (insertion order in the seed loop), which is an
// implementation detail, not something worth the user noticing shift around.
const CATEGORY_ORDER = ['Posts', 'Social', 'Chat', 'Relationships', 'Live Streaming', 'Gifts', 'Challenges', 'Card Games', 'Other'];

export default function AchievementsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [all, setAll] = useState<Achievement[]>([]);
  const [mine, setMine] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        fetchApi('/achievements', { headers: { 'Cache-Control': 'no-cache' } }).then((r) => (r.ok ? r.json() : [])),
        fetchApi('/achievements/mine', { headers: { 'Cache-Control': 'no-cache' } }).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([allRes, mineRes]) => {
          setAll(Array.isArray(allRes) ? allRes : []);
          setMine(Array.isArray(mineRes) ? mineRes : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  const unlockedByAchievementId = new Map(mine.map((m) => [m.achievementId, m.unlockedAt]));

  const sections = CATEGORY_ORDER.map((title) => ({
    title,
    data: all.filter((a) => categoryFor(a.code) === title),
  })).filter((s) => s.data.length > 0);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    progressWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
    progressLabel: { ...TYPOGRAPHY.body2, color: COLORS.textMuted, marginBottom: 6 },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.glass, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 4 },
    sectionHeader: {
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.sm,
    },
    sectionHeaderText: {
      ...TYPOGRAPHY.label,
      color: COLORS.secondary,
    },
    row: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg },
    badge: {
      flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 6, marginBottom: SPACING.sm,
    },
    badgeUnlocked: { borderColor: 'rgba(251,191,36,0.4)', backgroundColor: 'rgba(251,191,36,0.08)' },
    badgeLocked: { opacity: 0.5 },
    badgeName: { color: COLORS.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
    badgeDesc: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
    badgeDate: { color: COLORS.gold, fontSize: 10, fontWeight: '600', marginTop: 2 },
  }));

  // SectionList doesn't have a built-in 2-column grid, so each section's
  // `data` is chunked into rows of 2 here and rendered as one row per item.
  const chunkedSections = sections.map((s) => ({
    title: s.title,
    data: Array.from({ length: Math.ceil(s.data.length / 2) }, (_, i) => s.data.slice(i * 2, i * 2 + 2)),
  }));

  const renderBadge = (item: Achievement) => {
    const unlockedAt = unlockedByAchievementId.get(item.id);
    const unlocked = !!unlockedAt;
    return (
      <View key={item.id} style={[styles.badge, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
        <Ionicons name={unlocked ? 'ribbon' : 'lock-closed'} size={28} color={unlocked ? COLORS.gold : COLORS.textMuted} />
        <Text style={styles.badgeName}>{item.name}</Text>
        <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>
        {unlocked && (
          <Text style={styles.badgeDate}>{new Date(unlockedAt).toLocaleDateString()}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Achievements</Text>
        <View style={{ width: 36 }} />
      </View>

      {!loading && all.length > 0 && (
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>{mine.length} of {all.length} unlocked</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round((mine.length / all.length) * 100)}%` }]} />
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <SectionList
          sections={chunkedSections}
          keyExtractor={(row, index) => row.map((a) => a.id).join('-') || String(index)}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
            </View>
          )}
          renderItem={({ item: row }) => (
            <View style={styles.row}>
              {row.map(renderBadge)}
              {row.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <EmptyState icon="ribbon-outline" title="No achievements yet" subtitle="Keep using Guranda — achievements will show up here as you earn them." />
          }
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}
