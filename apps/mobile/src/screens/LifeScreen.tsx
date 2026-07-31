import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, SPACING, BRAND, GRADIENTS } from '../theme';
import { LifeModule } from '../config/modules';
import ModuleCard from '../components/ModuleCard';

export default function LifeScreen({ navigation }: any) {
  const EXPLORE_ITEMS: LifeModule[] = [
    {
      id: 'miniapps_installed',
      name: 'Mini Apps',
      icon: 'apps',
      gradient: GRADIENTS.emerald,
      tagline: 'Your installed mini apps',
      status: 'live',
      description: '',
      features: [],
      route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Hub', params: { mode: 'installed-miniapps' } } } }
    },
    {
      id: 'games_installed',
      name: 'Games',
      icon: 'game-controller',
      gradient: GRADIENTS.aurora,
      tagline: 'Your installed games',
      status: 'live',
      description: '',
      features: [],
      route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Games', params: { mode: 'installed-games' } } } }
    },
    {
      id: 'live_module',
      name: 'Live',
      icon: 'radio',
      gradient: GRADIENTS.live,
      tagline: 'Broadcast to the world',
      status: 'live',
      description: '',
      features: [],
      route: { name: 'Live' }
    },
    {
      id: 'discovery_module',
      name: 'Discovery',
      icon: 'play-circle',
      gradient: GRADIENTS.crimson,
      tagline: 'Videos tailored to you',
      status: 'live',
      description: '',
      features: [],
      route: { name: 'Discovery' }
    },
    {
      id: 'store_module',
      name: 'Store',
      icon: 'storefront',
      gradient: GRADIENTS.primary,
      tagline: 'Get new apps & games',
      status: 'live',
      description: '',
      features: [],
      route: { name: 'Main', params: { screen: 'Life', params: { screen: 'Hub', params: { mode: 'store' } } } }
    }
  ];

  const openRoute = (module: LifeModule) => {
    if (module.route) {
      navigation.navigate(module.route.name, module.route.params);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Life</Text>
          <Text style={styles.subtitle}>{BRAND.tagline}</Text>
        </View>
        <Text style={styles.sectionLabel}>EXPLORE</Text>
        <View style={styles.grid}>
          {EXPLORE_ITEMS.map(m => (
            <ModuleCard key={m.id} module={m} onPress={mod => openRoute(mod)} />
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  subtitle: {
    ...TYPOGRAPHY.body2,
    marginTop: 4,
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
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  sheetIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: 4,
  },
  sheetTagline: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  sheetDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: COLORS.text,
    fontSize: 13,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  installBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  installGradient: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  installText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
