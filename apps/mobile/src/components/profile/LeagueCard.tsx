import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

// Bronze/Silver/Gold/Platinum/Diamond/Legendary — same names as the Couples
// rank tiers (relationships.service.ts), applied to individual reputation.
// "Unranked" is the floor tier (reputation.util.ts leagueForReputation).
export const LEAGUE_COLORS: Record<string, string> = {
  'Legendary League': '#F472B6',
  'Diamond League': '#22D3EE',
  'Platinum League': '#A78BFA',
  'Gold League': '#FBBF24',
  'Silver League': '#9CA3AF',
  'Bronze League': '#CD7F32',
  Unranked: '#6B7280',
};

export interface LeagueCardData {
  rating: number;
  league: string;
  leaguePosition: number;
  leagueSize: number;
}

// Shared between UserProfileScreen (viewing someone else) and ProfilePillars
// (your own profile) — same competitive-bracket data, same visual, so the
// two profile views never drift into showing this differently.
export default function LeagueCard({ data }: { data: LeagueCardData }) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    leagueCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      width: '100%' as const,
    },
    leagueItem: { flex: 1 },
    leagueLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginBottom: 2 },
    leagueDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: SPACING.sm },
    leagueNameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
    leagueNameText: { fontSize: 11.5, fontWeight: '800' as const, flexShrink: 1 as const },
    leaguePositionText: { color: COLORS.text, fontSize: 13, fontWeight: '800' as const },
  }));

  const leagueColor = LEAGUE_COLORS[data.league] || COLORS.textMuted;

  return (
    <View style={styles.leagueCard}>
      <View style={styles.leagueItem}>
        <Text style={styles.leagueLabel}>Rating</Text>
        <View style={styles.leagueNameRow}>
          <Ionicons name="star" size={13} color={COLORS.gold} />
          <Text style={[styles.leagueNameText, { color: COLORS.gold }]}>{data.rating}</Text>
        </View>
      </View>
      <View style={styles.leagueDivider} />
      <View style={styles.leagueItem}>
        <Text style={styles.leagueLabel}>League</Text>
        <View style={styles.leagueNameRow}>
          <Ionicons name="trophy" size={13} color={leagueColor} />
          <Text style={[styles.leagueNameText, { color: leagueColor }]} numberOfLines={1}>{data.league}</Text>
        </View>
      </View>
      <View style={styles.leagueDivider} />
      <View style={styles.leagueItem}>
        <Text style={styles.leagueLabel}>Position</Text>
        <Text style={styles.leaguePositionText}>#{data.leaguePosition} of {data.leagueSize}</Text>
      </View>
    </View>
  );
}
