import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { formatCount } from '../../utils/format';

export interface ProfilePillarsData {
  reputation: { value: number; deltaWeek: number | null };
  growth: { xp: number; deltaWeek: number | null };
  rank: {
    level: string;
    subscribers: number;
    nextLevel: string | null;
    subscribersNeeded: number | null;
    ladder: { level: string; min: number }[];
  };
  impact: { value: number; deltaWeek: number | null };
}

function deltaSentence(deltaWeek: number | null, unit: string): string {
  if (deltaWeek === null) return 'Building your history';
  if (deltaWeek > 0) return `Up ${formatCount(deltaWeek)} ${unit} this week`;
  if (deltaWeek < 0) return `Down ${formatCount(Math.abs(deltaWeek))} ${unit} this week`;
  return 'Steady this week';
}

export default function ProfilePillars({ data }: { data: ProfilePillarsData }) {
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    card: {
      flexBasis: '47%' as any,
      flexGrow: 1,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: SPACING.sm,
    },
    label: { ...TYPOGRAPHY.label, fontSize: 10 },
    value: { ...TYPOGRAPHY.h3, fontSize: 22, marginTop: 4 },
    sentence: { ...TYPOGRAPHY.caption, fontSize: 11, marginTop: 6 },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      marginTop: SPACING.sm,
      overflow: 'hidden' as const,
    },
    progressFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.gold },
    ladderRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: SPACING.sm },
    ladderDot: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
    },
    ladderDotDone: { backgroundColor: COLORS.gold },
  }));

  const rankLadderIdx = data.rank.ladder.findIndex((t) => t.level === data.rank.level);
  const rankProgress =
    data.rank.subscribersNeeded !== null && data.rank.subscribersNeeded > 0
      ? data.rank.subscribers / (data.rank.subscribers + data.rank.subscribersNeeded)
      : 1;

  const pillars = [
    {
      key: 'reputation',
      icon: 'shield-checkmark' as const,
      color: '#8B5CF6',
      label: 'Reputation',
      value: formatCount(data.reputation.value),
      sentence: deltaSentence(data.reputation.deltaWeek, 'points'),
    },
    {
      key: 'growth',
      icon: 'trending-up' as const,
      color: '#34D399',
      label: 'Growth',
      value: `${formatCount(data.growth.xp)} XP`,
      sentence: deltaSentence(data.growth.deltaWeek, 'XP'),
    },
    {
      key: 'rank',
      icon: 'flash' as const,
      color: '#FBBF24',
      label: 'Rank',
      value: data.rank.level,
      sentence: data.rank.nextLevel
        ? `${formatCount(data.rank.subscribersNeeded ?? 0)} to ${data.rank.nextLevel}`
        : 'Top tier reached',
      progress: data.rank.nextLevel ? rankProgress : null,
    },
    {
      key: 'impact',
      icon: 'sparkles' as const,
      color: '#22D3EE',
      label: 'Impact',
      value: formatCount(data.impact.value),
      sentence: deltaSentence(data.impact.deltaWeek, 'points'),
    },
  ];

  return (
    <View style={styles.grid}>
      {pillars.map((p) => (
        <View key={p.key} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: p.color + '22' }]}>
            <Ionicons name={p.icon} size={17} color={p.color} />
          </View>
          <Text style={styles.label}>{p.label}</Text>
          <Text style={styles.value} numberOfLines={1}>{p.value}</Text>
          <Text style={styles.sentence} numberOfLines={2}>{p.sentence}</Text>
          {p.progress !== null && p.progress !== undefined && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(Math.min(1, Math.max(0, p.progress)) * 100)}%` }]} />
            </View>
          )}
          {p.key === 'rank' && (
            <View style={styles.ladderRow}>
              {data.rank.ladder.map((tier, tierIdx) => (
                <View
                  key={tier.level}
                  style={[styles.ladderDot, tierIdx <= rankLadderIdx && styles.ladderDotDone]}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
