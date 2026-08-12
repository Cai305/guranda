import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';

// ── Shape returned by GET /entertainment/events/:id/share-card ──────────────
export interface EventCardData {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  startsAt: string;           // ISO string
  price: number;              // MSH
  ticketsAvailable: number;
  posterUrl?: string | null;
  description?: string | null;
  organizer?: string | null;
}

// Encode/decode helpers — mirror the __productCard pattern in ProductMiniCard
// so ChatScreen's renderMessage can detect the payload type in one place.
export const EVENT_CARD_TAG = '__eventCard';

export function encodeEventCard(data: EventCardData): string {
  return JSON.stringify({ [EVENT_CARD_TAG]: true, ...data });
}

export function decodeEventCard(content: string): EventCardData | null {
  try {
    if (!content.includes(EVENT_CARD_TAG)) return null;
    const parsed = JSON.parse(content);
    if (!parsed[EVENT_CARD_TAG]) return null;
    const { [EVENT_CARD_TAG]: _tag, ...rest } = parsed;
    return rest as EventCardData;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  event: EventCardData;
  /** The userId of the person the sender is chatting with — used for gift flow */
  chatTargetUserId?: string;
  chatTargetName?: string;
  navigation?: any;
  /** If false, only shows "View Event" — no booking actions (e.g. sent by the other side) */
  canBook?: boolean;
}

export default function EventMiniCard({
  event,
  chatTargetUserId,
  chatTargetName,
  navigation,
  canBook = true,
}: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;

  const [bookingMe, setBookingMe]     = useState(false);
  const [giftingThem, setGiftingThem] = useState(false);
  const isFree = event.price === 0;

  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    card: {
      backgroundColor: 'rgba(15,15,25,0.97)',
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.25)',
      overflow: 'hidden',
      minWidth: 240,
      maxWidth: 300,
    },
    poster: {
      width: '100%',
      height: 140,
    },
    posterFallback: {
      width: '100%',
      height: 140,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryPill: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    categoryText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    pricePill: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.4)',
    },
    priceText: {
      color: '#a78bfa',
      fontSize: 12,
      fontWeight: '800',
    },
    body: {
      padding: 12,
      gap: 6,
    },
    title: {
      color: COLORS.text,
      fontWeight: '800',
      fontSize: 14,
      lineHeight: 19,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaText: {
      color: COLORS.textMuted,
      fontSize: 11.5,
      flex: 1,
    },
    availPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: event.ticketsAvailable > 0
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(239,68,68,0.12)',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: event.ticketsAvailable > 0
        ? 'rgba(34,197,94,0.3)'
        : 'rgba(239,68,68,0.3)',
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    availDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: event.ticketsAvailable > 0 ? '#22c55e' : '#ef4444',
    },
    availText: {
      color: event.ticketsAvailable > 0 ? '#22c55e' : '#ef4444',
      fontSize: 10,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.07)',
      marginHorizontal: 12,
    },
    actions: {
      flexDirection: 'row',
      padding: 10,
      gap: 8,
    },
    viewBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.35)',
      borderRadius: RADIUS.pill,
      paddingVertical: 8,
      backgroundColor: 'rgba(139,92,246,0.08)',
    },
    viewBtnText: {
      color: COLORS.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    bookBtn: {
      flex: 1,
      borderRadius: RADIUS.pill,
      overflow: 'hidden',
    },
    bookBtnGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 8,
    },
    bookBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
    },
    giftBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: 'rgba(236,72,153,0.35)',
      borderRadius: RADIUS.pill,
      paddingVertical: 8,
      backgroundColor: 'rgba(236,72,153,0.08)',
    },
    giftBtnText: {
      color: '#ec4899',
      fontWeight: '700',
      fontSize: 12,
    },
  }));

  const handleBook = async () => {
    if (!user?.userId) return;
    Alert.alert(
      `Book ticket`,
      `Book 1 ticket for "${event.title}" for ${isFree ? 'FREE' : formatCurrency(event.price)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBookingMe(true);
            try {
              const res = await fetchApi(`/entertainment/events/${event.id}/book`, {
                method: 'POST',
                body: JSON.stringify({ tickets: 1 }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Booking failed');
              }
              const booking = await res.json();
              Alert.alert('Booked! 🎟️', `Your ticket code: ${booking.ticketItems?.[0]?.code ?? 'See My Bookings'}`);
              navigation?.navigate('MyEntertainmentBookings');
            } catch (e: any) {
              Alert.alert('Booking failed', e.message || 'Please try again.');
            } finally {
              setBookingMe(false);
            }
          },
        },
      ],
    );
  };

  const handleGift = async () => {
    if (!user?.userId || !chatTargetUserId) return;
    const name = chatTargetName || 'them';
    Alert.alert(
      `Gift ticket to ${name}`,
      `Buy 1 ticket for "${event.title}" (${isFree ? 'FREE' : formatCurrency(event.price)}) and gift it to ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Gift 🎁',
          onPress: async () => {
            setGiftingThem(true);
            try {
              const res = await fetchApi(`/entertainment/events/${event.id}/gift-ticket`, {
                method: 'POST',
                body: JSON.stringify({ recipientUserId: chatTargetUserId, tickets: 1 }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Gift failed');
              }
              Alert.alert('Gifted! 🎁', `A ticket to "${event.title}" has been sent to ${name}.`);
            } catch (e: any) {
              Alert.alert('Gift failed', e.message || 'Please try again.');
            } finally {
              setGiftingThem(false);
            }
          },
        },
      ],
    );
  };

  const soldOut = event.ticketsAvailable === 0;

  return (
    <View style={styles.card}>
      {/* Poster */}
      <View style={{ position: 'relative' }}>
        {event.posterUrl ? (
          <Image source={{ uri: event.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#4c1d95', '#7c3aed', '#db2777']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.posterFallback}
          >
            <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        )}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{isFree ? 'Free' : formatCurrency(event.price)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>{event.venue}, {event.city}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{formatDate(event.startsAt)} · {formatTime(event.startsAt)}</Text>
        </View>

        <View style={styles.availPill}>
          <View style={styles.availDot} />
          <Text style={styles.availText}>
            {soldOut ? 'Sold Out' : `${event.ticketsAvailable} tickets left`}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actions}>
        {/* View */}
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation?.navigate('EventDetail', { eventId: event.id })}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>

        {canBook && !soldOut && (
          <>
            {/* Book for myself */}
            <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={bookingMe} activeOpacity={0.85}>
              <LinearGradient
                colors={['#7c3aed', '#db2777']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.bookBtnGrad}
              >
                {bookingMe
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="ticket-outline" size={14} color="#fff" />
                      <Text style={styles.bookBtnText}>Book</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Gift to chat partner */}
            {!!chatTargetUserId && (
              <TouchableOpacity
                style={styles.giftBtn}
                onPress={handleGift}
                disabled={giftingThem}
                activeOpacity={0.8}
              >
                {giftingThem
                  ? <ActivityIndicator size="small" color="#ec4899" />
                  : <>
                      <Ionicons name="gift-outline" size={14} color="#ec4899" />
                      <Text style={styles.giftBtnText}>Gift</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}
