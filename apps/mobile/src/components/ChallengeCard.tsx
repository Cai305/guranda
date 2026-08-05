import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

const CATEGORY_ICON: Record<string, string> = {
  DANCE: 'body',
  COMEDY: 'happy',
  FITNESS: 'barbell',
  GAMING: 'game-controller',
  PHOTOGRAPHY: 'camera',
  COOKING: 'restaurant',
  BUSINESS: 'briefcase',
  MUSIC: 'musical-notes',
  LIFESTYLE: 'sparkles',
  SPORTS: 'football',
  COUPLES: 'heart',
  SPONSORED: 'ribbon',
};

const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  DANCE: ['#DB2777', '#831843'],
  COMEDY: ['#EA580C', '#7C2D12'],
  FITNESS: ['#E11D48', '#881337'],
  GAMING: ['#7C3AED', '#4C1D95'],
  PHOTOGRAPHY: ['#0891B2', '#164E63'],
  COOKING: ['#D97706', '#78350F'],
  BUSINESS: ['#15803D', '#14532D'],
  MUSIC: ['#DB2777', '#831843'],
  LIFESTYLE: ['#9333EA', '#581C87'],
  SPORTS: ['#16A34A', '#14532D'],
  COUPLES: ['#F43F5E', '#881337'],
  SPONSORED: ['#CA8A04', '#713F12'],
};

const TYPE_LABEL: Record<string, string> = {
  DAILY: 'Daily',
  FLASH: 'Flash',
  WEEKEND: 'Weekend',
  SEASONAL: 'Seasonal',
  SPONSORED: 'Sponsored',
};

function timeRemaining(endAt: string): string {
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export interface ChallengeSummary {
  id: string;
  title: string;
  category: string;
  type: string;
  endAt: string;
  coverImageUrl?: string | null;
  sponsorLabel?: string | null;
  xpReward: number;
  _count?: { entries: number };
}

export default function ChallengeCard({ challenge, onPress }: { challenge: ChallengeSummary; onPress: () => void }) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const grad = CATEGORY_GRADIENT[challenge.category] ?? ['#1E293B', '#0F172A'];
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    card: {
      width: '48%',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      marginBottom: SPACING.md,
    },
    cover: { width: '100%', aspectRatio: 1.3, backgroundColor: '#0F172A' },
    coverIcon: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    typeBadge: {
      position: 'absolute', top: 6, left: 6,
      backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: RADIUS.pill,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    typeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    timeBadge: {
      position: 'absolute', bottom: 6, right: 6,
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: RADIUS.pill,
      paddingHorizontal: 7, paddingVertical: 3,
    },
    timeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    body: { padding: SPACING.sm },
    title: { ...TYPOGRAPHY.body1, fontSize: 13, fontWeight: '700', lineHeight: 17, marginBottom: 6 },
    metaRow: { flexDirection: 'row', gap: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    sponsorText: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  }));
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.cover}>
        {challenge.coverImageUrl ? (
          <Image source={{ uri: challenge.coverImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient colors={grad} style={StyleSheet.absoluteFillObject}>
            <View style={styles.coverIcon}>
              <Ionicons name={(CATEGORY_ICON[challenge.category] ?? 'star') as any} size={32} color="rgba(255,255,255,0.55)" />
            </View>
          </LinearGradient>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{TYPE_LABEL[challenge.type] ?? challenge.type}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Ionicons name="time-outline" size={11} color="#fff" />
          <Text style={styles.timeBadgeText}>{timeRemaining(challenge.endAt)}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{challenge.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{challenge._count?.entries ?? 0}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flash" size={13} color={COLORS.gold} />
            <Text style={[styles.metaText, { color: COLORS.gold }]}>{challenge.xpReward} XP</Text>
          </View>
        </View>
        {!!challenge.sponsorLabel && (
          <Text style={styles.sponsorText} numberOfLines={1}>Sponsored by {challenge.sponsorLabel}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
