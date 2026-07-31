import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { LIVE_CATEGORIES, openLiveCategory } from '../../config/liveCategories';
import { streamsForTag, LiveStream } from '../../data/mockLiveStreams';
import { fetchLiveRooms, RealLiveStream } from '../../data/liveApi';
import LiveStreamCard from '../../components/LiveStreamCard';
import LiveCategoryCard from '../../components/LiveCategoryCard';
import SectionHeader from '../../components/SectionHeader';
import SessionHeaderActions from '../../components/SessionHeaderActions';

// Discover Live: the entry point into the whole Live module.
// Quick tag filters cut across categories (Trending, Nearby...);
// the category rail below opens the rich, per-category page.
// Real rooms currently being broadcast (fetched from the backend)
// are merged in ahead of the illustrative mock catalog.
export default function LiveScreen({ navigation }: any) {
  const [activeTag, setActiveTag] = useState('All');
  const [query, setQuery] = useState('');
  const [realRooms, setRealRooms] = useState<RealLiveStream[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchLiveRooms().then(rooms => !cancelled && setRealRooms(rooms));
      return () => { cancelled = true; };
    }, [])
  );

  const streams = useMemo(() => {
    const realFiltered = activeTag === 'All' ? realRooms : realRooms.filter(r => r.tags.includes(activeTag));
    const mockFiltered = streamsForTag(activeTag);
    const base = [...realFiltered, ...mockFiltered];
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(s => s.title.toLowerCase().includes(q) || s.creator.name.toLowerCase().includes(q));
  }, [activeTag, query, realRooms]);

  const openStream = (stream: LiveStream) => navigation.navigate('LiveViewer', { stream });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <SessionHeaderActions
            navigation={navigation}
            session={{
              id: 'live',
              label: 'Live',
              icon: 'radio',
              gradient: GRADIENTS.crimson,
              route: { name: 'Live' },
            }}
          />
          <Text style={TYPOGRAPHY.h2}>Live</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GoLive')}>
            <LinearGradient colors={GRADIENTS.live} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goLiveBtn}>
              <Ionicons name="radio" size={14} color="#FFF" />
              <Text style={styles.goLiveText}>Go Live</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search streams, creators..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>

        {/* Discover tag chips */}
        <FlatList
          horizontal
          data={['All', 'Following', 'Trending', 'Nearby', 'Gaming', 'Shopping', 'Education', 'Business', 'Entertainment', 'Sports', 'Music', 'Food', 'Technology', 'News']}
          keyExtractor={t => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, activeTag === item && styles.chipActive]}
              onPress={() => setActiveTag(item)}
            >
              <Text style={[styles.chipText, activeTag === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Live grid */}
        <View style={styles.grid}>
          {streams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="radio-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No live streams match "{activeTag}" right now</Text>
            </View>
          ) : (
            streams.map(s => <LiveStreamCard key={s.id} stream={s} onPress={openStream} />)
          )}
        </View>

        {/* Browse categories */}
        <SectionHeader title="Browse Categories" />
        <FlatList
          horizontal
          data={LIVE_CATEGORIES}
          keyExtractor={c => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <LiveCategoryCard category={item} onPress={c => openLiveCategory(navigation, c)} />
          )}
        />
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
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  chipRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  chip: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    rowGap: SPACING.md,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body2,
    textAlign: 'center',
  },
});
