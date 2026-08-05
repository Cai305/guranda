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
}

// Generic "search-result" card shared by every AI chat widget list (shopping
// products, stays, flights, cars, marketplace listings, carfind, eat stores,
// property) — same image/badge/title/price/meta shape each module's own home
// screen already uses, just reusable here instead of duplicated per domain.
export default function WidgetCard({
  imageUrl,
  placeholderIcon,
  badge,
  title,
  priceLabel,
  metaLines,
  onPress,
}: WidgetCardProps) {
  const { theme } = useTheme();
  const { GRADIENTS } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    card: {
      width: CARD_WIDTH,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
    },
    imageWrap: { width: '100%', height: 88 },
    image: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    badge: {
      position: 'absolute', top: 6, left: 6,
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
    info: { padding: SPACING.sm, gap: 2 },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 12.5, minHeight: 32 },
    price: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
    meta: { color: COLORS.textMuted, fontSize: 10.5 },
  }));
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
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
  );
}

const CARD_WIDTH = 152;
