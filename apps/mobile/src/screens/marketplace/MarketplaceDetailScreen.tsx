import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';

function useCountdown(endsAt?: string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m left` : m > 0 ? `${m}m ${s}s left` : `${s}s left`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);
  return remaining;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#A78BFA', SOLD: '#10B981', EXPIRED: '#6B7280', CANCELLED: '#F87171',
};

export default function MarketplaceDetailScreen({ navigation, route }: any) {
  const { listingId } = route.params || {};
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const galleryWidth = width - SPACING.lg * 2;
  const [listing, setListing] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchApi(`/marketplace/listings/${listingId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setListing)
      .catch(() => {});
  }, [listingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const countdown = useCountdown(listing?.listingType === 'AUCTION' ? listing?.auctionEndsAt : null);

  if (!listing) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#A78BFA" />
      </SafeAreaView>
    );
  }

  const isSeller = listing.seller?.id === user?.userId;
  const isAuction = listing.listingType === 'AUCTION';
  const isActive = listing.status === 'ACTIVE';
  const minBid = listing.currentBid ? Number(listing.currentBid) + 0.01 : Number(listing.price);

  const buyNow = async () => {
    try {
      setBusy(true);
      const res = await fetchApi(`/marketplace/listings/${listingId}/buy`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Purchase failed');
      Alert.alert('Purchased! 🎉', `You bought ${listing.title} for ${listing.price} MSH.`);
      load();
    } catch (e: any) {
      Alert.alert('Purchase failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const placeBid = async () => {
    const amount = parseFloat(bidAmount);
    if (!(amount >= minBid)) {
      Alert.alert('Bid too low', `Your bid must be at least ${minBid.toFixed(2)} MSH.`);
      return;
    }
    try {
      setBusy(true);
      const res = await fetchApi(`/marketplace/listings/${listingId}/bid`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Bid failed');
      setBidAmount('');
      Alert.alert('Bid placed!', `You're now the highest bidder at ${amount} MSH.`);
      load();
    } catch (e: any) {
      Alert.alert('Bid failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelListing = async () => {
    try {
      setBusy(true);
      const res = await fetchApi(`/marketplace/listings/${listingId}/cancel`, { method: 'PATCH' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Could not cancel');
      Alert.alert('Listing cancelled');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Cancel failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2} numberOfLines={1}>{listing.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {listing.images?.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {listing.images.map((url: string, i: number) => (
              <Image key={i} source={{ uri: url }} style={[styles.galleryImage, { width: galleryWidth }]} />
            ))}
          </ScrollView>
        ) : (
          <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.heroImage}>
            <Ionicons name="image-outline" size={56} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        )}

        <View style={styles.body}>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { borderColor: STATUS_COLOR[listing.status] + '88', backgroundColor: STATUS_COLOR[listing.status] + '22' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[listing.status] }]}>{listing.status}</Text>
            </View>
            {isAuction && isActive && (
              <View style={styles.countdownPill}>
                <Ionicons name="time-outline" size={13} color="#F59E0B" />
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}
          </View>

          <Text style={styles.price}>
            {isAuction ? (listing.currentBid ? 'Current bid: ' : 'Starting bid: ') : ''}
            {(isAuction ? (listing.currentBid ?? listing.price) : listing.price)} MSH
          </Text>
          <Text style={styles.meta}>{listing.category} · {listing.condition.replace('_', ' ')}</Text>
          {listing.description && <Text style={styles.description}>{listing.description}</Text>}

          <View style={styles.sellerCard}>
            <Image
              source={{ uri: listing.seller?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${listing.seller?.username}` }}
              style={styles.sellerAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{listing.seller?.profile?.displayName || listing.seller?.username}</Text>
              <Text style={styles.sellerRole}>Seller · @{listing.seller?.username}</Text>
            </View>
          </View>

          {isActive && !isSeller && !isAuction && (
            <TouchableOpacity style={styles.buyBtn} onPress={buyNow} disabled={busy}>
              {busy ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="cart" size={18} color="#FFF" />
                  <Text style={styles.buyBtnText}>Buy Now — {listing.price} MSH</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isActive && !isSeller && isAuction && (
            <View style={styles.bidCard}>
              <Text style={styles.bidLabel}>Place a bid (min {minBid.toFixed(2)} MSH)</Text>
              <View style={styles.bidRow}>
                <TextInput
                  style={styles.bidInput}
                  placeholder={minBid.toFixed(2)}
                  placeholderTextColor={COLORS.textMuted}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.bidBtn} onPress={placeBid} disabled={busy}>
                  {busy ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.bidBtnText}>Bid</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isSeller && isActive && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelListing} disabled={busy}>
              <Text style={styles.cancelBtnText}>Cancel Listing</Text>
            </TouchableOpacity>
          )}

          {listing.status === 'SOLD' && (
            <View style={styles.soldBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.soldBannerText}>This item has been sold.</Text>
            </View>
          )}

          {isAuction && listing.bids?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>BID HISTORY</Text>
              <View style={styles.bidHistory}>
                {listing.bids.map((b: any) => (
                  <View key={b.id} style={styles.bidHistoryRow}>
                    <Text style={styles.bidHistoryName}>{b.bidder?.profile?.displayName || b.bidder?.username}</Text>
                    <Text style={styles.bidHistoryAmount}>{b.amount} MSH</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#150A2E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  heroImage: { height: 220, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  gallery: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, height: 220 },
  galleryImage: { height: 220, borderRadius: RADIUS.lg },
  body: { padding: SPACING.lg },
  statusRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  statusPill: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  countdownPill: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  countdownText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  price: { color: '#A78BFA', fontWeight: '800', fontSize: 22, marginTop: 10 },
  meta: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  description: { color: COLORS.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 12 },
  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: 12,
  },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3A0E6E' },
  sellerName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  sellerRole: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
  buyBtn: {
    flexDirection: 'row', gap: 8, marginTop: 18,
    backgroundColor: '#7C3AED', borderRadius: RADIUS.pill, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  buyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  bidCard: {
    marginTop: 18, backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', borderRadius: RADIUS.lg, padding: 14,
  },
  bidLabel: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  bidRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  bidInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.glassBorder, color: COLORS.text,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 13,
  },
  bidBtn: { backgroundColor: '#7C3AED', borderRadius: RADIUS.pill, paddingHorizontal: 20, justifyContent: 'center' },
  bidBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  cancelBtn: {
    marginTop: 18, borderRadius: RADIUS.pill, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)', alignItems: 'center',
  },
  cancelBtnText: { color: '#F87171', fontWeight: '700', fontSize: 13.5 },
  soldBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 18,
    backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: RADIUS.md, padding: 12,
  },
  soldBannerText: { color: '#10B981', fontSize: 12.5, fontWeight: '600' },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  bidHistory: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden',
  },
  bidHistoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
  },
  bidHistoryName: { color: COLORS.text, fontSize: 12.5 },
  bidHistoryAmount: { color: '#A78BFA', fontWeight: '700', fontSize: 12.5 },
});
