import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  FlatList, Image, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { EventCardData, encodeEventCard } from './cards/EventMiniCard';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with the encoded event card payload — identical to how MiniAppProductPicker calls onSendProduct */
  onSendEvent: (encodedPayload: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export default function MiniAppEventPicker({ visible, onClose, onSendEvent }: Props) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SPACING } = theme;

  const [events, setEvents]   = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    if (!visible) { setSearch(''); return; }
    setLoading(true);
    fetchApi('/entertainment/events')
      .then(r => r.json())
      .then((data: any[]) => {
        setEvents(
          (Array.isArray(data) ? data : []).map(e => ({
            id: e.id,
            title: e.title,
            category: e.category,
            venue: e.venue,
            city: e.city,
            startsAt: e.startsAt,
            price: e.price,
            ticketsAvailable: e.ticketsAvailable,
            posterUrl: e.posterUrl ?? null,
            description: e.description ?? null,
            organizer: e.organizer?.username ?? null,
          }))
        );
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = (ev: EventCardData) => {
    onSendEvent(encodeEventCard(ev));
    onClose();
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    sheet: { flex: 1, backgroundColor: COLORS.surface },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 6,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    headerTitle: { ...TYPOGRAPHY.h2, fontSize: 17 },
    closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-end' },
    searchWrap: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
    emptyText: { color: COLORS.textMuted, fontSize: 15 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.border, padding: 12, overflow: 'hidden',
    },
    poster: { width: 56, height: 56, borderRadius: RADIUS.md, overflow: 'hidden' },
    posterImg: { width: 56, height: 56, borderRadius: RADIUS.md },
    posterFallback: { width: 56, height: 56, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, gap: 2 },
    eventTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    eventMeta: { color: COLORS.textMuted, fontSize: 11 },
    eventPrice: { color: '#a78bfa', fontWeight: '800', fontSize: 13, marginTop: 2 },
    soldOut: { color: '#ef4444', fontWeight: '700', fontSize: 11 },
    actions: { gap: 6, alignItems: 'center' },
    sendBtn: { borderRadius: RADIUS.pill, overflow: 'hidden' },
    sendBtnGrad: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    disabledBtn: {
      borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7,
      backgroundColor: COLORS.border,
    },
    disabledText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share an Event</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events…"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No upcoming events found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: SPACING.lg, gap: 10 }}
            renderItem={({ item: ev }) => {
              const soldOut = ev.ticketsAvailable === 0;
              return (
                <View style={styles.row}>
                  {/* Poster thumbnail */}
                  <View style={styles.poster}>
                    {ev.posterUrl ? (
                      <Image source={{ uri: ev.posterUrl }} style={styles.posterImg} resizeMode="cover" />
                    ) : (
                      <LinearGradient
                        colors={['#4c1d95', '#7c3aed']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.posterFallback}
                      >
                        <Ionicons name="calendar" size={22} color="rgba(255,255,255,0.5)" />
                      </LinearGradient>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.info}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                    <Text style={styles.eventMeta} numberOfLines={1}>
                      {ev.venue}, {ev.city}
                    </Text>
                    <Text style={styles.eventMeta}>{formatDate(ev.startsAt)}</Text>
                    {soldOut
                      ? <Text style={styles.soldOut}>Sold Out</Text>
                      : <Text style={styles.eventPrice}>
                          {ev.price === 0 ? 'Free' : formatCurrency(ev.price)}
                        </Text>
                    }
                  </View>

                  {/* Send button */}
                  <View style={styles.actions}>
                    {soldOut ? (
                      <View style={styles.disabledBtn}>
                        <Text style={styles.disabledText}>Sold Out</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={() => handleSend(ev)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={['#7c3aed', '#db2777']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.sendBtnGrad}
                        >
                          <Ionicons name="send" size={13} color="#fff" />
                          <Text style={styles.sendBtnText}>Share</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
