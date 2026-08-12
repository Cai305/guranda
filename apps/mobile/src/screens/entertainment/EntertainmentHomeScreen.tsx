import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { streamsForCategory, LiveStream } from '../../data/mockLiveStreams';
import { fetchLiveRooms, RealLiveStream } from '../../data/liveApi';
import LiveStreamCard from '../../components/LiveStreamCard';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import { formatCurrency } from '../../utils/format';

type Tab = 'movies' | 'music' | 'events' | 'streaming';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'movies', label: 'Movies', icon: 'film' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'events', label: 'Live Events', icon: 'ticket' },
  { key: 'streaming', label: 'Streaming', icon: 'radio' },
];

const dateStr = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function EntertainmentHomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SPACING } = theme;
  const [tab, setTab] = useState<Tab>('movies');
  const [items, setItems] = useState<any[]>([]);
  const [streams, setStreams] = useState<LiveStream[]>(streamsForCategory('entertainment'));
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, 900) - SPACING.lg * 2 - 12) / 2;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 4 },
    headerCenter: { flex: 1 },
    headerTitle: { ...TYPOGRAPHY.h2 },
    headerSub: { color: COLORS.textMuted, fontSize: 12 },
    bookingsBtn: { padding: 6 },
    hero: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
    heroIcon: { position: 'absolute', right: 16, top: 12 },
    heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
    heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 16 },
    tabChip: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      paddingVertical: 9, borderRadius: 20,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    tabChipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
    tabLabel: { color: COLORS.textMuted, fontSize: 10.5, fontWeight: '700' },
    tabLabelActive: { color: '#fff' },
    grid: {
      paddingHorizontal: SPACING.lg, gap: 12,
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    },
    card: {
      backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
    },
    cardImage: { width: '100%', height: 150, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { padding: 10 },
    cardName: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    cardSub: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
    cardPrice: { color: '#F97316', fontWeight: '800', fontSize: 15 },
    cardPriceUnit: { color: COLORS.textMuted, fontWeight: '500', fontSize: 11 },
    listCard: {
      backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row',
    },
    listImage: { width: 100, height: 110, justifyContent: 'center', alignItems: 'center' },
    listInfo: { flex: 1, padding: 12 },
    listTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    listSub: { color: '#F97316', fontSize: 12, fontWeight: '600', marginBottom: 4 },
    listMeta: { color: COLORS.textMuted, fontSize: 11, marginBottom: 6 },
    listPrice: { color: '#F97316', fontWeight: '800', fontSize: 15 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    emptySub: { color: COLORS.textMuted, fontSize: 13 },
  }));

  const load = useCallback(async (currentTab: Tab) => {
    if (currentTab === 'streaming') {
      setLoading(true);
      try {
        const real = await fetchLiveRooms();
        const realEntertainment = (real as RealLiveStream[]).filter(s => s.categoryId === 'entertainment');
        setStreams([...realEntertainment, ...streamsForCategory('entertainment')]);
      } catch { setStreams(streamsForCategory('entertainment')); }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const endpoint = { movies: '/entertainment/movies', music: '/entertainment/concerts', events: '/entertainment/events' }[currentTab];
      const res = await fetchApi(endpoint);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [tab, load]));

  const openDetail = (item: any) => {
    if (tab === 'movies') navigation.navigate('MovieDetail', { movieId: item.id });
    else if (tab === 'music') navigation.navigate('ConcertDetail', { concertId: item.id });
    else navigation.navigate('EventDetail', { eventId: item.id });
  };

  const openStream = (stream: LiveStream) => navigation.navigate('LiveViewer', { stream });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'entertainment',
            label: 'Entertainment',
            icon: 'film',
            gradient: GRADIENTS.sunset,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'EntertainmentHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Entertainment</Text>
          <Text style={styles.headerSub}>Movies, music & live events</Text>
        </View>
        <TouchableOpacity style={styles.bookingsBtn} onPress={() => navigation.navigate('MyEvents')}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookingsBtn} onPress={() => navigation.navigate('MyEntertainmentBookings')}>
          <Ionicons name="ticket-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={GRADIENTS.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="film" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Culture on demand</Text>
        <Text style={styles.heroSub}>Book with your Guranda wallet, everywhere</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => { setItems([]); setTab(t.key); }}
          >
            <Ionicons name={t.icon as any} size={14} color={tab === t.key ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : tab === 'streaming' ? (
          streams.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="radio-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nothing live right now</Text>
              <Text style={styles.emptySub}>Check back soon for entertainment streams</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {streams.map(s => <LiveStreamCard key={s.id} stream={s} onPress={openStream} />)}
            </View>
          )
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="sad-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nothing found</Text>
            <Text style={styles.emptySub}>Check back soon</Text>
          </View>
        ) : tab === 'movies' ? (
          <View style={styles.grid}>
            {items.map(movie => (
              <TouchableOpacity key={movie.id} style={[styles.card, { width: cardWidth }]} activeOpacity={0.85} onPress={() => openDetail(movie)}>
                {movie.posterUrl ? (
                  <Image source={{ uri: movie.posterUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={GRADIENTS.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardImage}>
                    <Ionicons name="film" size={28} color="rgba(255,255,255,0.4)" />
                  </LinearGradient>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{movie.title}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{movie.genre} · {movie.rating}</Text>
                  {movie.showtimes?.length > 0 && (
                    <Text style={styles.cardPrice}>
                      {formatCurrency(Math.min(...movie.showtimes.map((s: any) => s.price)))}
                      <Text style={styles.cardPriceUnit}> from</Text>
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : tab === 'music' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 12 }}>
            {items.map(concert => (
              <TouchableOpacity key={concert.id} style={styles.listCard} activeOpacity={0.85} onPress={() => openDetail(concert)}>
                {concert.posterUrl ? (
                  <Image source={{ uri: concert.posterUrl }} style={styles.listImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.listImage}>
                    <Ionicons name="musical-notes" size={28} color="rgba(255,255,255,0.4)" />
                  </LinearGradient>
                )}
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle} numberOfLines={1}>{concert.title}</Text>
                  <Text style={styles.listSub} numberOfLines={1}>{concert.artist} · {concert.venue}</Text>
                  <Text style={styles.listMeta}>{concert.city} · {dateStr(concert.startsAt)}</Text>
                  <Text style={styles.listPrice}>{formatCurrency(concert.price)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 12 }}>
            {items.map(event => (
              <TouchableOpacity key={event.id} style={styles.listCard} activeOpacity={0.85} onPress={() => openDetail(event)}>
                {event.posterUrl ? (
                  <Image source={{ uri: event.posterUrl }} style={styles.listImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={GRADIENTS.emerald} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.listImage}>
                    <Ionicons name="ticket" size={28} color="rgba(255,255,255,0.4)" />
                  </LinearGradient>
                )}
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.listSub} numberOfLines={1}>{event.category} · {event.venue}</Text>
                  <Text style={styles.listMeta}>{event.city} · {dateStr(event.startsAt)}</Text>
                  <Text style={styles.listPrice}>{formatCurrency(event.price)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
