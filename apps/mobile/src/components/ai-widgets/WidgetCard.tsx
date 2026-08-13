import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

export interface WidgetCardProps {
  imageUrl?: string;
  placeholderIcon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  title: string;
  priceLabel?: string;
  metaLines: string[];
  onPress: () => void;
  /** Label for the card's action button — every widget card shows one, so
   * the user always has an explicit next step rather than only a tappable
   * card (e.g. "View product", "Book stay"). */
  actionLabel: string;
  /** True when this is the item the Interaction Engine currently has
   * selected (via tap, or a resolved "the second one" / "next"). See
   * WidgetActionResolverService (server) and docs/19_AI_Engine_Audit_And_Design.md §10. */
  selected?: boolean;
}

// Generic "search-result" card shared by every AI chat widget list (shopping
// products, stays, flights, cars, marketplace listings, carfind, eat stores,
// property) — same image/badge/title/price/meta shape each module's own home
// screen already uses, just reusable here instead of duplicated per domain.
// Full-width (stretches to its container) so it reads cleanly inside the AI
// tray instead of a cramped horizontal rail.
export default function WidgetCard({
  imageUrl,
  placeholderIcon,
  badge,
  title,
  priceLabel,
  metaLines,
  onPress,
  actionLabel,
  selected,
}: WidgetCardProps) {
  const { theme } = useTheme();
  const { GRADIENTS } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    card: {
      alignSelf: 'stretch',
      backgroundColor: COLORS.glass,
      borderWidth: selected ? 2 : 1,
      borderColor: selected ? COLORS.primary : COLORS.glassBorder,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row' },
    imageWrap: { width: 96, height: 96 },
    image: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    badge: {
      position: 'absolute', top: 6, left: 6,
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
    info: { flex: 1, padding: SPACING.sm, gap: 2, justifyContent: 'center' },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
    price: { color: COLORS.primary, fontWeight: '800', fontSize: 13.5 },
    meta: { color: COLORS.textMuted, fontSize: 11 },
    actionBtn: {
      backgroundColor: COLORS.glass, borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
      paddingVertical: 10, alignItems: 'center',
    },
    actionText: { color: COLORS.primary, fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },
  }));
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onPress}>
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name={placeholderIcon} size={28} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {priceLabel && <Text style={styles.price}>{priceLabel}</Text>}
          {metaLines.slice(0, 2).map((line, i) => (
            <Text key={i} style={styles.meta} numberOfLines={1}>{line}</Text>
          ))}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={onPress}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
