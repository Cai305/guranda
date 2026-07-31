import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { LiveCreator, MOCK_SCHEDULE, MOCK_REPLAYS } from '../../data/mockLiveStreams';
import { getLiveCategory } from '../../config/liveCategories';
import { formatCount } from '../../utils/format';

export default function LiveCreatorProfileScreen({ navigation, route }: any) {
  const creator: LiveCreator = route?.params?.creator;
  const [following, setFollowing] = useState(false);
  if (!creator) return null;

  const schedule = MOCK_SCHEDULE.filter(s => creator.categoryIds.includes(s.categoryId));
  const replays = MOCK_REPLAYS.filter(r => creator.categoryIds.includes(r.categoryId));

  const remindMe = (title: string) =>
    Alert.alert('Reminder set 🔔', `We'll notify you when "${title}" goes live.`);

  const playReplay = (title: string) =>
    Alert.alert('Coming Soon 🚧', `Replay playback for "${title}" is coming once VOD storage ships.`);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={GRADIENTS.midnight} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.identityCard}>
          <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${creator.avatarSeed}` }} style={styles.avatar} />
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{creator.name}</Text>
            {creator.verified && <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />}
          </View>

          <View style={styles.categoryRow}>
            {creator.categoryIds.map(id => {
              const cat = getLiveCategory(id);
              if (!cat) return null;
              return (
                <View key={id} style={styles.categoryPill}>
                  <Ionicons name={cat.icon as any} size={12} color={COLORS.text} />
                  <Text style={styles.categoryPillText}>{cat.name}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(creator.followers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(creator.following)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(creator.totalViews)}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(creator.totalLikes)}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={() => setFollowing(f => !f)}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.watchTimeCard}>
          <Ionicons name="time-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.watchTimeText}>{formatCount(creator.watchTimeHours)} hours watched by the community</Text>
        </View>

        {creator.badges.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>BADGES</Text>
            <View style={styles.badgeRow}>
              {creator.badges.map((b, i) => (
                <View key={i} style={styles.badgeChip}>
                  <Text style={styles.badgeChipText}>{b}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>SCHEDULE</Text>
        {schedule.length > 0 ? (
          <View style={styles.card}>
            {schedule.map((s, i) => (
              <View key={s.id} style={[styles.rowItem, i < schedule.length - 1 && styles.rowBorder]}>
                <View style={styles.rowIcon}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{s.title}</Text>
                  <Text style={styles.rowDetail}>{s.when}</Text>
                </View>
                <TouchableOpacity style={styles.remindBtn} onPress={() => remindMe(s.title)}>
                  <Ionicons name="notifications-outline" size={14} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No scheduled streams yet.</Text>
        )}

        <Text style={styles.sectionLabel}>PREVIOUS STREAMS</Text>
        {replays.length > 0 ? (
          <View style={styles.card}>
            {replays.map((r, i) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.rowItem, i < replays.length - 1 && styles.rowBorder]}
                onPress={() => playReplay(r.title)}
              >
                <View style={[styles.rowIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons name="play-circle-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.title}</Text>
                  <Text style={styles.rowDetail}>{r.when} · {formatCount(r.views)} views</Text>
                </View>
                <View style={styles.comingSoonPill}>
                  <Text style={styles.comingSoonPillText}>🚧</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No previous streams yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  displayName: {
    ...TYPOGRAPHY.h2,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryPillText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    marginTop: 2,
  },
  followBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  followBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  followBtnTextActive: {
    color: '#FFF',
  },
  watchTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  watchTimeText: {
    ...TYPOGRAPHY.body2,
    fontSize: 13,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  badgeChip: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: SPACING.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowDetail: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 2,
  },
  remindBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonPill: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonPillText: {
    fontSize: 12,
  },
  emptyText: {
    ...TYPOGRAPHY.body2,
    paddingHorizontal: SPACING.lg,
  },
});
