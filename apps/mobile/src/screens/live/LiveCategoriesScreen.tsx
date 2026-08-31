import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { LIVE_CATEGORIES, openLiveCategory, LiveCategory } from '../../config/liveCategories';
import { streamsForCategory } from '../../data/mockLiveStreams';
import { fetchLiveRooms, RealLiveStream } from '../../data/liveApi';

// Landing page for the Live module: pick a category first, then go
// in. The full mixed search+grid discover feed (LiveScreen) is still
// one tap away via "Browse all live streams", for anyone who wants
// the unfiltered view instead of picking a category up front.
export default function LiveCategoriesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, TYPOGRAPHY } = theme;
  const [realRooms, setRealRooms] = useState<RealLiveStream[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchLiveRooms().then(rooms => !cancelled && setRealRooms(rooms));
      return () => { cancelled = true; };
    }, [])
  );

  const liveCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of LIVE_CATEGORIES) {
      const real = realRooms.filter(r => r.categoryId === cat.id).length;
      const mock = streamsForCategory(cat.id).length;
      counts[cat.id] = real + mock;
    }
    return counts;
  }, [realRooms]);

  const openCategory = (category: LiveCategory) => openLiveCategory(navigation, category);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
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
    goLiveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.pill,
    },
    goLiveText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 13,
    },
    subtitle: {
      ...TYPOGRAPHY.body2,
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
    card: {
      width: '48%',
    },
    cardGradient: {
      borderRadius: RADIUS.lg,
      padding: 14,
      height: 128,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWrapLocked: {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#F87171',
    },
    liveBadgeText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    cardName: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
    },
    cardTagline: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 11,
      marginTop: 2,
    },
    allStreamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
    },
    allStreamsText: {
      ...TYPOGRAPHY.body1,
      flex: 1,
    },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Live</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GoLive')}>
            <LinearGradient colors={GRADIENTS.live} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goLiveBtn}>
              <Ionicons name="radio" size={14} color="#FFF" />
              <Text style={styles.goLiveText}>Go Live</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>What kind of live are you looking for?</Text>

        <View style={styles.grid}>
          {LIVE_CATEGORIES.map(cat => {
            const count = liveCountByCategory[cat.id] || 0;
            const locked = cat.status === 'construction';
            return (
              <TouchableOpacity key={cat.id} style={styles.card} activeOpacity={0.85} onPress={() => openCategory(cat)}>
                <LinearGradient
                  colors={locked ? [COLORS.surfaceElevated, COLORS.surface] : cat.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconWrap, locked && styles.iconWrapLocked]}>
                      <Ionicons name={cat.icon as any} size={22} color={locked ? cat.gradient[0] : '#FFF'} />
                    </View>
                    {!locked && count > 0 && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>{count}</Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={styles.cardName} numberOfLines={1}>{cat.name}</Text>
                    <Text style={[styles.cardTagline, locked && { color: COLORS.textMuted }]} numberOfLines={2}>
                      {cat.tagline}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.allStreamsRow} activeOpacity={0.8} onPress={() => navigation.navigate('Live')}>
          <Ionicons name="apps" size={18} color={COLORS.textMuted} />
          <Text style={styles.allStreamsText}>Browse all live streams</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

