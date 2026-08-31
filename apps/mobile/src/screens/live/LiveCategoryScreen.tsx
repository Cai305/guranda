import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getLiveCategory } from '../../config/liveCategories';
import { streamsForCategory, LiveStream } from '../../data/mockLiveStreams';
import LiveStreamCard from '../../components/LiveStreamCard';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

// Rich detail page for a single Live category — what makes it
// different (hostSummary), what it's for, its full feature set, and
// a way to actually go live in it. Ride Live is routed straight to
// the shared UnderConstruction screen instead since the whole
// category is still "future use".
export default function LiveCategoryScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, RADIUS, TYPOGRAPHY }) => ({
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
      marginHorizontal: SPACING.lg,
      borderRadius: RADIUS.xl,
      paddingVertical: SPACING.xl,
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    heroIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    heroTitle: {
      ...TYPOGRAPHY.h2,
      color: '#FFF',
    },
    heroTagline: {
      ...TYPOGRAPHY.body2,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 4,
      marginBottom: SPACING.lg,
    },
    goLiveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FFF',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    goLiveBtnText: {
      fontWeight: '800',
      fontSize: 14,
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
    featureChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    featureChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    featureChipText: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '600',
    },
    hostSummaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    hostSummaryText: {
      ...TYPOGRAPHY.body2,
      flex: 1,
      lineHeight: 20,
      fontWeight: '600',
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
    emptyState: {
      marginHorizontal: SPACING.lg,
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.xl,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: RADIUS.lg,
    },
    emptyText: {
      ...TYPOGRAPHY.body2,
      textAlign: 'center',
      paddingHorizontal: SPACING.lg,
    },
  }));

  const category = getLiveCategory(route?.params?.categoryId);
  if (!category) return null;

  const streams = streamsForCategory(category.id);
  const tint = category.gradient[0];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3} numberOfLines={1}>{category.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={category.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={category.icon as any} size={36} color="#FFF" />
          </View>
          <Text style={styles.heroTitle}>{category.name}</Text>
          <Text style={styles.heroTagline}>{category.tagline}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.goLiveBtn}
            onPress={() => navigation.navigate('GoLive', { categoryId: category.id })}
          >
            <Ionicons name="radio" size={16} color={tint} />
            <Text style={[styles.goLiveBtnText, { color: tint }]}>Go Live in {category.name.replace(' Live', '')}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={[styles.card, styles.hostSummaryCard, { borderColor: `${tint}55`, backgroundColor: `${tint}14` }]}>
          <Ionicons name="flash" size={20} color={tint} />
          <Text style={styles.hostSummaryText}>{category.hostSummary}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>WHAT THIS IS FOR</Text>
          <Text style={styles.description}>{category.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>FEATURES</Text>
          <View style={styles.featureChips}>
            {category.features.map((f, i) => (
              <View key={i} style={[styles.featureChip, { borderColor: `${tint}40`, backgroundColor: `${tint}12` }]}>
                <Ionicons name="checkmark" size={12} color={tint} />
                <Text style={styles.featureChipText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>
          {streams.length > 0 ? 'LIVE NOW' : 'NO LIVE STREAMS RIGHT NOW'}
        </Text>
        {streams.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyState, { borderColor: `${tint}40` }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('GoLive', { categoryId: category.id })}
          >
            <Ionicons name="radio-outline" size={28} color={tint} />
            <Text style={styles.emptyText}>Be the first to go live in {category.name}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.grid}>
            {streams.map((s: LiveStream) => (
              <LiveStreamCard key={s.id} stream={s} onPress={stream => navigation.navigate('LiveViewer', { stream, streams, initialIndex: streams.findIndex((x: LiveStream) => x.id === stream.id) })} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
