import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { formatCount } from '../../utils/format';

export interface BadgeInfo {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  maxSupply: number | null;
  mintedCount: number;
}

export interface BadgesData {
  owned: (BadgeInfo & { mintedAt: string })[];
  locked: BadgeInfo[];
}

function supplyLabel(b: BadgeInfo): string | null {
  if (b.maxSupply === null) return null;
  return `${formatCount(b.mintedCount)} / ${formatCount(b.maxSupply)} claimed`;
}

export default function BadgesGrid({ data }: { data: BadgesData }) {
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    row: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
    card: {
      alignItems: 'center' as const,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      width: 108,
    },
    lockedCard: { opacity: 0.4 },
    emoji: { fontSize: 26 },
    name: { ...TYPOGRAPHY.caption, fontSize: 11, marginTop: 4, textAlign: 'center' as const },
    supply: { ...TYPOGRAPHY.caption, fontSize: 9, marginTop: 3, textAlign: 'center' as const, color: COLORS.gold },
    perk: { ...TYPOGRAPHY.caption, fontSize: 9, marginTop: 3, textAlign: 'center' as const, color: COLORS.success },
    empty: {
      ...TYPOGRAPHY.body2,
      paddingHorizontal: SPACING.lg,
    },
  }));

  const badges = [...data.owned, ...data.locked];
  if (badges.length === 0) {
    return <Text style={styles.empty}>No badges yet — keep going, they're earned.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {data.owned.map((b) => (
        <View key={b.id} style={styles.card}>
          <Text style={styles.emoji}>{b.icon}</Text>
          <Text style={styles.name} numberOfLines={2}>{b.name}</Text>
          {!!supplyLabel(b) && <Text style={styles.supply}>{supplyLabel(b)}</Text>}
          {GIFT_DISCOUNT_BADGES.has(b.code) && <Text style={styles.perk}>10% off gifts</Text>}
        </View>
      ))}
      {data.locked.map((b) => (
        <View key={b.id} style={[styles.card, styles.lockedCard]}>
          <Text style={styles.emoji}>{b.icon}</Text>
          <Text style={styles.name} numberOfLines={2}>{b.name}</Text>
          {supplyLabel(b) ? (
            <Text style={styles.supply}>{supplyLabel(b)}</Text>
          ) : (
            <Text style={styles.supply}>Locked</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// Mirrors GIFT_DISCOUNT_BADGE_CODES in apps/api/src/gifts/gifts.service.ts —
// which badges unlock the gift-price discount, purely for the "10% off
// gifts" hint shown on the owned badge card here.
const GIFT_DISCOUNT_BADGES = new Set(['FOUNDER', 'OG_CREATOR', 'EARLY_LIVE_HOST']);
