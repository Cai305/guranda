import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#A78BFA', SOLD: '#10B981', EXPIRED: '#6B7280', CANCELLED: '#F87171',
};

export default function MyBidsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [invoiceByListing, setInvoiceByListing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchApi('/marketplace/listings/my-bids')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setListings(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchApi('/marketplace/invoices/mine')
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (!Array.isArray(data)) return;
        const map: Record<string, string> = {};
        data.forEach((inv: any) => { map[inv.listingId] = inv.id; });
        setInvoiceByListing(map);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
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
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 10,
    },
    thumb: { width: 52, height: 52, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
    meta: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 3 },
    invoiceLink: { color: '#A78BFA', fontSize: 11, fontWeight: '700', marginTop: 4 },
    statusPill: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 4 },
    statusText: { fontSize: 9.5, fontWeight: '800' },
    empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
  }));

  const renderItem = ({ item }: { item: any }) => {
    const won = item.status === 'SOLD' && item.buyerId === user?.userId;
    const winning = item.status === 'ACTIVE' && item.currentBidderId === user?.userId;
    const invoiceId = invoiceByListing[item.id];
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MarketplaceDetail', { listingId: item.id })}
      >
        {item.images?.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.thumb} />
        ) : (
          <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.thumb}>
            <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.listingType === 'AUCTION' ? `Bid: ${item.currentBid ?? item.price} MSH` : `${item.price} MSH`}
            {winning ? ' · Winning' : won ? ' · You won!' : ''}
          </Text>
          {won && invoiceId && (
            <TouchableOpacity onPress={() => navigation.navigate('Invoice', { invoiceId })}>
              <Text style={styles.invoiceLink}>View Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.statusPill, { borderColor: STATUS_COLOR[item.status] + '88', backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Bids & Purchases</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={listings}
        keyExtractor={l => l.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.empty}>{loading ? 'Loading…' : "You haven't bid on or bought anything yet."}</Text>
        }
      />
    </SafeAreaView>
  );
}
