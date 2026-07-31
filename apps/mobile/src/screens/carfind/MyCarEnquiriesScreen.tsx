import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

// Buyer dashboard: every enquiry you've sent to a seller, and the car it
// was about.

export default function MyCarEnquiriesScreen({ navigation }: any) {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchApi('/carfind/enquiries/mine')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setEnquiries(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Enquiries</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 40 }}>
        {enquiries.length === 0 && (
          <Text style={styles.empty}>
            {loading ? 'Loading…' : "You haven't enquired about any cars yet — browse CarFind and send a seller a message."}
          </Text>
        )}

        {enquiries.map(e => (
          <TouchableOpacity
            key={e.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CarFindDetail', { carId: e.listing.id })}
          >
            {e.listing.images?.[0] ? (
              <Image source={{ uri: e.listing.images[0] }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons name="car-sport" size={22} color="#A78BFA" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.carTitle} numberOfLines={1}>{e.listing.title}</Text>
              <Text style={styles.carPrice}>{e.listing.price.toLocaleString()} MSH</Text>
              <Text style={styles.message} numberOfLines={2}>"{e.message}"</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  card: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder,
    padding: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.md, backgroundColor: '#2E1065' },
  thumbFallback: { justifyContent: 'center', alignItems: 'center' },
  carTitle: { color: COLORS.text, fontWeight: '800', fontSize: 13.5 },
  carPrice: { color: '#A78BFA', fontWeight: '700', fontSize: 12, marginTop: 2 },
  message: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 },
});
