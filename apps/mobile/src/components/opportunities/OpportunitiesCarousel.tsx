import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { OpportunityCardDto } from '@mxit2/types';
import { fetchApi } from '../../utils/api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import OpportunityCard from './OpportunityCard';

const ROTATE_INTERVAL_MS = 2 * 60 * 1000;

// One card at a time, auto-advancing every 2 minutes — a rotating featured
// slot rather than a horizontal ad rail, so it stays minimal/discovery-
// focused instead of competing with the rest of Home for width. Renders
// nothing while empty so it never shows as a placeholder gap.
export default function OpportunitiesCarousel({ navigation }: { navigation: any }) {
  const [items, setItems] = useState<OpportunityCardDto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchApi('/opportunities/feed')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setItems(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setActiveIndex(i => (i + 1) % items.length);
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Same section-title convention as the rest of Home (SectionHeader's
  // TYPOGRAPHY.h3 + fontWeight 600, SPACING.xl top rhythm) — matches "Live
  // Now" instead of its own one-off font/padding.
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    wrap: { marginTop: SPACING.xl, marginBottom: SPACING.md },
    label: { ...TYPOGRAPHY.h3, fontWeight: '600', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    cardWrap: { paddingHorizontal: SPACING.lg },
    dots: { flexDirection: 'row', gap: 5, paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
    dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.border },
    dotActive: { backgroundColor: COLORS.primary, width: 14 },
  }));

  // Campaign cards open the full CampaignDetailScreen first (title, reward,
  // its own action button, brand updates) — missions skip straight to the
  // Challenge's own detail screen, which already serves that purpose.
  const open = (item: OpportunityCardDto) => {
    if (item.origin === 'campaign') {
      navigation.navigate('CampaignDetail', { campaignId: item.id });
      return;
    }
    navigation.navigate(item.actionRoute.name, item.actionRoute.params);
  };

  if (items.length === 0) return null;
  const current = items[activeIndex % items.length];

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Opportunities</Text>
      <Animated.View style={[styles.cardWrap, { opacity: fade }]}>
        <OpportunityCard item={current} onPress={() => open(current)} />
      </Animated.View>
      {items.length > 1 && (
        <View style={styles.dots}>
          {items.map((it, i) => (
            <View key={it.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}
