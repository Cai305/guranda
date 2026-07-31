import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS, BRAND } from '../theme';
import { getModule, LifeModule } from '../config/modules';

// Beautiful placeholder page for every Guranda module that is
// still being built. Explains what the feature will become —
// never a blank page.
export default function UnderConstructionScreen({ navigation, route }: any) {
  const params = route?.params || {};
  const module: LifeModule | undefined = getModule(params.moduleId);

  const name = params.name || module?.name || 'New Module';
  const icon = params.icon || module?.icon || 'construct';
  const gradient = module?.gradient || GRADIENTS.primary;
  const tagline = params.tagline || module?.tagline || 'Something new is coming to your digital life';
  const description = params.description || module?.description ||
    'This part of Guranda is being built. It will plug into your one identity, one wallet and one connected economy the moment it launches.';
  const features: string[] = params.features || module?.features || [];

  const handleNotify = () => {
    Alert.alert(
      "You're on the list ✨",
      `We'll notify you the moment ${name} goes live on ${BRAND.name}.`
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{name}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Ionicons name={icon as any} size={44} color="#FFF" />
          </LinearGradient>

          <View style={styles.constructionPill}>
            <Text style={styles.constructionText}>🚧 Under Construction</Text>
          </View>

          <Text style={styles.heroTitle}>{name}</Text>
          <Text style={styles.heroTagline}>{tagline}</Text>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>WHAT THIS WILL BECOME</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {/* Features */}
        {features.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>COMING TO {name.toUpperCase()}</Text>
            {features.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.featureDot, { backgroundColor: gradient[0] }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* One economy note */}
        <View style={[styles.card, styles.economyCard]}>
          <Ionicons name="infinite" size={22} color={COLORS.secondary} />
          <Text style={styles.economyText}>
            Like everything in {BRAND.name}, {name} will connect to your one identity,
            one wallet and one economy — earn, spend and build across your whole digital life.
          </Text>
        </View>

        {/* Notify CTA */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleNotify} style={styles.ctaWrapper}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Ionicons name="notifications" size={18} color="#FFF" />
            <Text style={styles.ctaText}>Notify me at launch</Text>
          </LinearGradient>
        </TouchableOpacity>
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
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  constructionPill: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: SPACING.lg,
  },
  constructionText: {
    color: COLORS.warning,
    fontWeight: '700',
    fontSize: 13,
  },
  heroTitle: {
    ...TYPOGRAPHY.h1,
    textAlign: 'center',
  },
  heroTagline: {
    ...TYPOGRAPHY.body2,
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
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
    lineHeight: 24,
    color: '#D6D6E2',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    ...TYPOGRAPHY.body1,
    fontSize: 15,
  },
  economyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  economyText: {
    ...TYPOGRAPHY.body2,
    flex: 1,
    lineHeight: 20,
  },
  ctaWrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
  },
  ctaText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
