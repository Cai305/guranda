import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

// Seller dashboard: every car listing you've published, with buyer
// enquiries received on each one.

export default function MyCarListingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchApi('/carfind/listings/mine')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setListings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleSold = async (listing: any) => {
    setTogglingId(listing.id);
    try {
      const res = await fetchApi(`/carfind/listings/${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sold: !listing.sold }),
      });
      if (res.ok) load();
      else Alert.alert('Update failed', 'Could not update this listing');
    } catch {
      Alert.alert('Update failed', 'Could not update this listing');
    } finally {
      setTogglingId(null);
    }
  };

  const remove = (listing: any) => {
    Alert.alert('Delete listing', `Remove "${listing.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const res = await fetchApi(`/carfind/listings/${listing.id}`, { method: 'DELETE' });
          if (res.ok) load();
          else Alert.alert('Delete failed', 'Could not delete this listing');
        },
      },
    ]);
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#160B2E' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40, lineHeight: 20 },
    emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyLink: { color: '#A78BFA', fontWeight: '700', fontSize: 13, marginTop: 4 },
    card: {
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15, flex: 1 },
    cardPrice: { color: '#A78BFA', fontWeight: '800', fontSize: 13 },
    cardSpecs: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
    actionsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    actionBtn: { flexDirection: 'row', gap: 5, alignItems: 'center' },
    actionText: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
    soldPill: {
      alignSelf: 'flex-start', marginTop: 10,
      backgroundColor: 'rgba(248,113,113,0.2)',
      borderWidth: 1, borderColor: 'rgba(248,113,113,0.6)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 9, paddingVertical: 3,
    },
    soldPillText: { color: '#F87171', fontSize: 10, fontWeight: '800' },
    enquiries: {
      marginTop: 12, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
    },
    subLabel: { color: COLORS.textMuted, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
    enquiryRow: { marginTop: 6 },
    enquiryFrom: { color: COLORS.text, fontWeight: '700', fontSize: 12.5 },
    enquiryMessage: { color: COLORS.textMuted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Listings</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('CarListingForm')}>
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 14, paddingBottom: 40 }}>
        {listings.length === 0 && (
          loading ? (
            <Text style={styles.empty}>Loading…</Text>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="car-sport-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.empty}>You haven't listed any cars yet.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CarListingForm')}>
                <Text style={styles.emptyLink}>List your first car</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {listings.map(listing => (
          <View key={listing.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{listing.title}</Text>
              <Text style={styles.cardPrice}>{formatCurrency(listing.price)}</Text>
            </View>
            <Text style={styles.cardSpecs}>
              {listing.year} · {listing.mileage.toLocaleString()}km · {listing.location}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CarFindDetail', { carId: listing.id })}>
                <Ionicons name="eye-outline" size={14} color="#A78BFA" />
                <Text style={styles.actionText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleSold(listing)} disabled={togglingId === listing.id}>
                {togglingId === listing.id ? (
                  <ActivityIndicator color="#A78BFA" size="small" />
                ) : (
                  <>
                    <Ionicons name={listing.sold ? 'refresh-outline' : 'checkmark-done-outline'} size={14} color="#A78BFA" />
                    <Text style={styles.actionText}>{listing.sold ? 'Mark available' : 'Mark sold'}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => remove(listing)}>
                <Ionicons name="trash-outline" size={14} color="#F87171" />
                <Text style={[styles.actionText, { color: '#F87171' }]}>Delete</Text>
              </TouchableOpacity>
            </View>

            {listing.sold && (
              <View style={styles.soldPill}><Text style={styles.soldPillText}>SOLD</Text></View>
            )}

            {listing.enquiries?.length > 0 && (
              <View style={styles.enquiries}>
                <Text style={styles.subLabel}>ENQUIRIES ({listing.enquiries.length})</Text>
                {listing.enquiries.map((e: any) => (
                  <View key={e.id} style={styles.enquiryRow}>
                    <Text style={styles.enquiryFrom}>@{e.buyer?.username}</Text>
                    <Text style={styles.enquiryMessage}>{e.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
