import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OpportunityCardDto } from '@mxit2/types';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

// Campaign types get a distinct gradient + icon per type — deliberately
// different from mission's single friendly emerald treatment, so a
// "Sponsored" business card never reads as the same thing as a community
// mission (see the plan's tone-separation requirement).
const CAMPAIGN_LOOK: Record<string, { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap }> = {
  BUSINESS: { gradient: ['#CA8A04', '#713F12'], icon: 'briefcase' },
  MINI_APP_LAUNCH: { gradient: ['#7C3AED', '#4C1D95'], icon: 'rocket' },
  PLATFORM_UPDATE: { gradient: ['#334155', '#0F172A'], icon: 'megaphone' },
  CREATOR_PROMO: { gradient: ['#DB2777', '#831843'], icon: 'star' },
  REVIEWER_RECOMMENDATION: { gradient: ['#0891B2', '#164E63'], icon: 'ribbon' },
};
const MISSION_LOOK: { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap } = {
  gradient: ['#15803D', '#14532D'],
  icon: 'people',
};

export default function OpportunityCard({ item, onPress }: { item: OpportunityCardDto; onPress: () => void }) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const isMission = item.origin === 'mission';
  const look = isMission ? MISSION_LOOK : (CAMPAIGN_LOOK[item.type] ?? CAMPAIGN_LOOK.BUSINESS);

  // One big banner card, full width of the row — height is still fixed
  // end-to-end (cover + locked 2-line title + single meta row + button) so
  // every card, mission or campaign, short title or long, is identical.
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    card: {
      width: '100%',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    cover: { width: '100%', height: 130, justifyContent: 'center', alignItems: 'center' },
    badge: {
      position: 'absolute', top: 10, left: 10,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: RADIUS.pill,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    body: { padding: SPACING.md },
    title: { color: COLORS.text, fontSize: 17, fontWeight: '700', lineHeight: 22, height: 44 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    actionBtn: {
      backgroundColor: isMission ? COLORS.success : COLORS.primary,
      borderRadius: RADIUS.pill,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  }));

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <LinearGradient colors={look.gradient} style={styles.cover}>
        <Ionicons name={look.icon} size={42} color="rgba(255,255,255,0.55)" />
        <View style={styles.badge}>
          <Ionicons name={isMission ? 'people' : 'flash'} size={12} color="#fff" />
          <Text style={styles.badgeText}>{item.subtitle}</Text>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="gift-outline" size={15} color={COLORS.gold} />
            <Text style={[styles.metaText, { color: COLORS.gold }]} numberOfLines={1}>{item.rewardLabel}</Text>
          </View>
          {!!item.estimatedMinutes && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={15} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{item.estimatedMinutes}m</Text>
            </View>
          )}
        </View>
        <View style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>{item.actionLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
