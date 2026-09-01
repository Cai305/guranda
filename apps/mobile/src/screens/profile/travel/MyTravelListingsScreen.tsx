import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

type Tab = 'stays' | 'cars';

export default function MyTravelListingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 8 },
    tabChip: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: 20,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    tabChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    tabLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
    tabLabelActive: { color: '#fff' },
    card: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
      padding: 12, gap: 12, borderWidth: 1, borderColor: COLORS.border,
    },
    thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    thumbImg: { width: '100%', height: '100%' },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    cardSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
    cardMeta: { color: COLORS.textMuted, fontSize: 11 },
    cardActions: { flexDirection: 'row', gap: 8 },
    editBtn: { padding: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: 8 },
    deleteBtn: { padding: 8, backgroundColor: '#ef444415', borderRadius: 8 },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
    emptyLink: { color: '#8B5CF6', fontWeight: '600', fontSize: 13, marginTop: 4 },
  }));
  const [tab, setTab] = useState<Tab>('stays');
  const [stays, setStays] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingStayId, setDeletingStayId] = useState<string | null>(null);
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [staysRes, carsRes] = await Promise.all([
        fetchApi('/travel/stays/mine'),
        fetchApi('/travel/cars/mine'),
      ]);
      setStays(await staysRes.json());
      setCars(await carsRes.json());
    } catch { setStays([]); setCars([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteStay = async (id: string) => {
    setDeletingStayId(id);
    try {
      await fetchApi(`/travel/stays/${id}`, { method: 'DELETE' });
      setStays(s => s.filter(x => x.id !== id));
    } catch {} finally {
      setDeletingStayId(null);
    }
  };

  const deleteCar = async (id: string) => {
    setDeletingCarId(id);
    try {
      await fetchApi(`/travel/cars/${id}`, { method: 'DELETE' });
      setCars(c => c.filter(x => x.id !== id));
    } catch {} finally {
      setDeletingCarId(null);
    }
  };

  const items = tab === 'stays' ? stays : cars;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate(tab === 'stays' ? 'AddEditTravelStay' : 'AddEditTravelCar', {})}
        >
          <Ionicons name="add-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabChip, tab === 'stays' && styles.tabChipActive]} onPress={() => setTab('stays')}>
          <Ionicons name="bed" size={14} color={tab === 'stays' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabLabel, tab === 'stays' && styles.tabLabelActive]}>Stays ({stays.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabChip, tab === 'cars' && styles.tabChipActive]} onPress={() => setTab('cars')}>
          <Ionicons name="car-sport" size={14} color={tab === 'cars' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabLabel, tab === 'cars' && styles.tabLabelActive]}>Car Hire ({cars.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name={tab === 'stays' ? 'bed-outline' : 'car-outline'} size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No {tab === 'stays' ? 'stays' : 'cars'} listed yet</Text>
              <TouchableOpacity onPress={() => navigation.navigate(tab === 'stays' ? 'AddEditTravelStay' : 'AddEditTravelCar', {})}>
                <Text style={styles.emptyLink}>List your first {tab === 'stays' ? 'stay' : 'car'}</Text>
              </TouchableOpacity>
            </View>
          ) : tab === 'stays' ? (
            stays.map(stay => (
              <View key={stay.id} style={styles.card}>
                <View style={styles.thumb}>
                  {stay.imageUrl ? <Image source={{ uri: stay.imageUrl }} style={styles.thumbImg} /> : <Ionicons name="bed" size={22} color={COLORS.textMuted} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{stay.title}</Text>
                  <Text style={styles.cardSub}>{stay.location} · {stay.pricePerNight.toFixed(0)} MSH/night</Text>
                  <Text style={styles.cardMeta}>{stay.bookings?.length ?? 0} booking{stay.bookings?.length === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('AddEditTravelStay', { stay })}>
                    <Ionicons name="create-outline" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteStay(stay.id)} disabled={deletingStayId === stay.id}>
                    {deletingStayId === stay.id ? (
                      <ActivityIndicator color="#ef4444" size="small" />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            cars.map(car => (
              <View key={car.id} style={styles.card}>
                <View style={styles.thumb}>
                  {car.imageUrl ? <Image source={{ uri: car.imageUrl }} style={styles.thumbImg} /> : <Ionicons name="car-sport" size={22} color={COLORS.textMuted} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{car.make} {car.model}</Text>
                  <Text style={styles.cardSub}>{car.location} · {car.pricePerDay.toFixed(0)} MSH/day</Text>
                  <Text style={styles.cardMeta}>{car.bookings?.length ?? 0} booking{car.bookings?.length === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('AddEditTravelCar', { car })}>
                    <Ionicons name="create-outline" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCar(car.id)} disabled={deletingCarId === car.id}>
                    {deletingCarId === car.id ? (
                      <ActivityIndicator color="#ef4444" size="small" />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
