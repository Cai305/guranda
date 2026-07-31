import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { getLiveCategory } from '../../config/liveCategories';
import { streamsForCategory, LiveStream } from '../../data/mockLiveStreams';
import LiveStreamCard from '../../components/LiveStreamCard';
import ConstructionBadge from '../../components/ConstructionBadge';

// Rich detail page for a single Live category — what it's for,
// what it can already do, and what's still coming. Ride Live is
// routed straight to the shared UnderConstruction screen instead
// since the whole category is still "future use".
export default function LiveCategoryScreen({ navigation, route }: any) {
  const category = getLiveCategory(route?.params?.categoryId);
  if (!category) return null;

  const streams = streamsForCategory(category.id);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>{category.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={category.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
            <Ionicons name={category.icon as any} size={40} color="#FFF" />
          </LinearGradient>
          <Text style={styles.heroTitle}>{category.name}</Text>
          <Text style={styles.heroTagline}>{category.tagline}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>WHAT THIS IS FOR</Text>
          <Text style={styles.description}>{category.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>FEATURES</Text>
          {category.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: category.gradient[0] }]}>
                <Ionicons name="checkmark" size={12} color="#FFF" />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          {category.futureFeatures?.map((f, i) => (
            <View key={`future-${i}`} style={styles.featureRow}>
              <ConstructionBadge compact />
              <Text style={[styles.featureText, { color: COLORS.textMuted, marginLeft: SPACING.sm }]}>{f}</Text>
            </View>
          ))}
        </View>

        {category.futureIntegration && (
          <View style={[styles.card, styles.integrationCard]}>
            <Ionicons name="infinite" size={20} color={COLORS.secondary} />
            <Text style={styles.integrationText}>
              Deeper integration with {category.futureIntegration} is 🚧 coming soon.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>
          {streams.length > 0 ? 'LIVE NOW' : 'NO LIVE STREAMS RIGHT NOW'}
        </Text>
        <View style={styles.grid}>
          {streams.map((s: LiveStream) => (
            <LiveStreamCard key={s.id} stream={s} onPress={stream => navigation.navigate('LiveViewer', { stream })} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    ...TYPOGRAPHY.h2,
  },
  heroTagline: {
    ...TYPOGRAPHY.body2,
    marginTop: 4,
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  cardLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    marginBottom: SPACING.md,
  },
  description: {
    ...TYPOGRAPHY.body1,
    lineHeight: 22,
    color: '#D6D6E2',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  featureText: {
    ...TYPOGRAPHY.body1,
    fontSize: 14,
  },
  integrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  integrationText: {
    ...TYPOGRAPHY.body2,
    flex: 1,
    lineHeight: 20,
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    rowGap: SPACING.md,
  },
});
