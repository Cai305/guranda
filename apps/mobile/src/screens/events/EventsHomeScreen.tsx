import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Image, TextInput, useWindowDimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

const CATEGORIES = ['All', 'Festival', 'Comedy', 'Theatre', 'Sports'];

const CATEGORY_ICONS: Record<string, string> = {
  All: 'apps',
  Festival: 'musical-notes',
  Comedy: 'happy',
  Theatre: 'videocam',
  Sports: 'football',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export default function EventsHomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const { width } = useWindowDimensions();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (cat: string) => {
    try {
      const params = cat !== 'All' ? `?category=${encodeURIComponent(cat)}` : '';
      const res = await fetchApi(`/entertainment/events${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(category);
    }, [category, load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(category);
  };

  const filtered = search.trim()
    ? events.filter(
        e =>
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.city?.toLowerCase().includes(search.toLowerCase()) ||
          e.venue?.toLowerCase().includes(search.toLowerCase()),
      )
    : events;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingTop: 8, paddingBottom: 4, gap: 10,
    },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    headerBtn: { padding: 6 },

    // Hero
    hero: {
      marginHorizontal: SPACING.lg, borderRadius: 20, padding: 20,
      marginBottom: 16, overflow: 'hidden', minHeight: 110,
    },
    heroIconBg: { position: 'absolute', right: -10, bottom: -10, opacity: 0.18 },
    heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
    heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
    heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
    heroBtn: {
      marginTop: 14, alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Search
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginHorizontal: SPACING.lg, marginBottom: 14,
      backgroundColor: COLORS.surface, borderRadius: 14,
      borderWidth: 1, borderColor: COLORS.border,
      paddingHorizontal: 12, paddingVertical: 2,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },

    // Category chips
    chipRow: { paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 16 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
    chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#fff' },

    // Event cards
    card: {
      backgroundColor: COLORS.surface, borderRadius: 18,
      borderWidth: 1, borderColor: COLORS.border,
      marginBottom: 14, overflow: 'hidden',
    },
    cardImageWrap: { width: '100%', height: 170 },
    cardImage: { width: '100%', height: '100%' },
    cardImageFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    categoryPill: {
      position: 'absolute', top: 12, left: 12,
      backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    categoryPillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    pricePill: {
      position: 'absolute', top: 12, right: 12,
      backgroundColor: '#10B981', borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    pricePillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    cardBody: { padding: 14 },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    cardMeta: { color: COLORS.textMuted, fontSize: 12 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    ticketsLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ticketsText: { color: COLORS.textMuted, fontSize: 11 },
    bookBtn: {
      backgroundColor: '#10B981', borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    soldOutBtn: {
      backgroundColor: COLORS.border, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    soldOutText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },

    // Empty / loading
    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
    emptyBtn: {
      marginTop: 8, backgroundColor: '#10B981', borderRadius: 14,
      paddingHorizontal: 24, paddingVertical: 12,
    },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // FAB
    fab: {
      position: 'absolute', bottom: 28, right: 22,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
      shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
    },
  }));

  const cardWidth = Math.min(width, 900) - SPACING.lg * 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('MyEvents')}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('MyEntertainmentBookings')}>
          <Ionicons name="ticket-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
      >
        {/* Hero */}
        <LinearGradient
          colors={['#10B981', '#22D3EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="ticket" size={120} color="#fff" style={styles.heroIconBg} />
          <Text style={styles.heroLabel}>Live Events</Text>
          <Text style={styles.heroTitle}>Discover what's{'\n'}happening near you</Text>
          <Text style={styles.heroSub}>Book with your Guranda wallet</Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('EventForm')}>
            <Ionicons name="add-circle-outline" size={15} color="#fff" />
            <Text style={styles.heroBtnText}>Create Event</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, cities..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => { setCategory(cat); setSearch(''); }}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat] as any}
                size={13}
                color={category === cat ? '#fff' : COLORS.textMuted}
              />
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Events list */}
        {loading ? (
          <ActivityIndicator color="#10B981" style={{ marginTop: 48 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={52} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {search ? 'No results found' : 'No events yet'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? `Try a different search term or category`
                : `Be the first to host an event in your city`}
            </Text>
            {!search && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('EventForm')}>
                <Text style={styles.emptyBtnText}>Create an Event</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg }}>
            {filtered.map(event => {
              const soldOut = event.ticketsAvailable === 0;
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.card, { width: cardWidth }]}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                >
                  {/* Image */}
                  <View style={styles.cardImageWrap}>
                    {event.posterUrl ? (
                      <Image source={{ uri: event.posterUrl }} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <LinearGradient
                        colors={['#10B981', '#22D3EE']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardImageFallback}
                      >
                        <Ionicons name="ticket" size={48} color="rgba(255,255,255,0.35)" />
                      </LinearGradient>
                    )}
                    {/* Category badge */}
                    <View style={styles.categoryPill}>
                      <Ionicons
                        name={(CATEGORY_ICONS[event.category] || 'calendar') as any}
                        size={10}
                        color="#fff"
                      />
                      <Text style={styles.categoryPillText}>{event.category}</Text>
                    </View>
                    {/* Price badge */}
                    <View style={styles.pricePill}>
                      <Text style={styles.pricePillText}>
                        {event.price === 0 ? 'FREE' : formatCurrency(event.price)}
                      </Text>
                    </View>
                  </View>

                  {/* Body */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

                    <View style={styles.cardMetaRow}>
                      <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {event.venue}, {event.city}
                      </Text>
                    </View>

                    <View style={styles.cardMetaRow}>
                      <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.cardMeta}>
                        {fmt(event.startsAt)} · {fmtTime(event.startsAt)}
                      </Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={styles.ticketsLeft}>
                        <Ionicons
                          name={soldOut ? 'close-circle-outline' : 'checkmark-circle-outline'}
                          size={14}
                          color={soldOut ? '#F87171' : '#10B981'}
                        />
                        <Text style={[styles.ticketsText, { color: soldOut ? '#F87171' : COLORS.textMuted }]}>
                          {soldOut ? 'Sold out' : `${event.ticketsAvailable} tickets left`}
                        </Text>
                      </View>

                      {soldOut ? (
                        <View style={styles.soldOutBtn}>
                          <Text style={styles.soldOutText}>Sold Out</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.bookBtn}
                          onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                        >
                          <Text style={styles.bookBtnText}>Book Now</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB — create event */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('EventForm')} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
