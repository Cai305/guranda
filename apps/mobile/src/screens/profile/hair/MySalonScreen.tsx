import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

const STATUS_COLOR: Record<string, string> = { PENDING: '#F59E0B', CONFIRMED: '#0EA5E9', COMPLETED: '#22c55e', CANCELLED: '#ef4444' };

export default function MySalonScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/hair/mine');
      const data = await res.json();
      setSalon(data?.id ? data : null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateBooking = async (bookingId: string, status: string) => {
    try {
      await fetchApi(`/hair/mine/bookings/${bookingId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setSalon((s: any) => ({ ...s, bookings: s.bookings.map((b: any) => (b.id === bookingId ? { ...b, status } : b)) }));
    } catch {}
  };

  const deleteService = async (id: string) => {
    setDeletingServiceId(id);
    try {
      await fetchApi(`/hair/mine/services/${id}`, { method: 'DELETE' });
      setSalon((s: any) => ({ ...s, services: s.services.filter((x: any) => x.id !== id) }));
    } catch {} finally {
      setDeletingServiceId(null);
    }
  };

  const deleteProduct = async (id: string) => {
    setDeletingProductId(id);
    try {
      await fetchApi(`/hair/mine/products/${id}`, { method: 'DELETE' });
      setSalon((s: any) => ({ ...s, products: s.products.filter((x: any) => x.id !== id) }));
    } catch {} finally {
      setDeletingProductId(null);
    }
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING, RADIUS }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: SPACING.lg },
    emptyTitle: { ...TYPOGRAPHY.h2 },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
    createBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    card: { margin: SPACING.lg, borderRadius: 16, padding: 18, gap: 12 },
    cardName: { color: '#fff', fontSize: 20, fontWeight: '800' },
    cardAddress: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
    stat: { alignItems: 'center' },
    statNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, marginBottom: 10 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
    emptyRow: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyRowText: { color: COLORS.textMuted, fontSize: 13 },
    itemRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      padding: 14, marginHorizontal: SPACING.lg, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 10,
    },
    itemImage: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceElevated },
    itemTitle: { color: COLORS.text, fontWeight: '600', fontSize: 13.5 },
    itemSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    iconBtn: { padding: 6 },
    apptDate: { color: COLORS.text, fontWeight: '600', fontSize: 13, marginBottom: 2 },
    apptSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
    statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    actionBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    cancelBtn: { backgroundColor: '#ef444422', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 },
    cancelBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (!salon) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Salon</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="cut-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No salon yet</Text>
          <Text style={styles.emptySub}>Set up your salon profile to start taking bookings for braids, cuts, and more.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('AddEditSalon', {})}>
            <Text style={styles.createBtnText}>Set up my salon</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pendingBookings = (salon.bookings || []).filter((b: any) => b.status === 'PENDING' || b.status === 'CONFIRMED');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{salon.businessName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddEditSalon', { salon })}>
          <Ionicons name="create-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
      >
        <LinearGradient colors={GRADIENTS.ocean ?? ['#38BDF8', '#0EA5E9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <Text style={styles.cardName}>{salon.businessName}</Text>
          {!!salon.address && <Text style={styles.cardAddress}>{salon.address}</Text>}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{salon.services?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{salon.products?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{salon.rating?.toFixed(1) ?? '—'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>SERVICES ({salon.services?.length ?? 0})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddEditSalonService', {})}>
            <Ionicons name="add-circle" size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {(salon.services || []).length === 0 ? (
          <View style={styles.emptyRow}><Text style={styles.emptyRowText}>No services yet — add your first one</Text></View>
        ) : (
          salon.services.map((s: any) => (
            <View key={s.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.title}</Text>
                <Text style={styles.itemSub}>{s.price.toFixed(0)} MSH · {s.duration} min</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddEditSalonService', { service: s })}>
                <Ionicons name="create-outline" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => deleteService(s.id)} disabled={deletingServiceId === s.id}>
                {deletingServiceId === s.id ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>PRODUCTS ({salon.products?.length ?? 0})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddEditSalonProduct', {})}>
            <Ionicons name="add-circle" size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {(salon.products || []).length === 0 ? (
          <View style={styles.emptyRow}><Text style={styles.emptyRowText}>No products yet</Text></View>
        ) : (
          salon.products.map((p: any) => (
            <View key={p.id} style={styles.itemRow}>
              {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{p.name}</Text>
                <Text style={styles.itemSub}>{p.price.toFixed(0)} MSH · {p.inStock ? 'In stock' : 'Out of stock'}</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddEditSalonProduct', { product: p })}>
                <Ionicons name="create-outline" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => deleteProduct(p.id)} disabled={deletingProductId === p.id}>
                {deletingProductId === p.id ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>BOOKINGS ({pendingBookings.length} active)</Text>
        </View>
        {(salon.bookings || []).length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyRowText}>No bookings yet</Text>
          </View>
        ) : (
          salon.bookings.map((b: any) => (
            <View key={b.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.apptDate}>{new Date(b.appointmentAt).toLocaleString()}</Text>
                <Text style={styles.apptSub}>
                  {b.service?.title} · {b.customer?.profile?.displayName || b.customer?.username} · {b.totalPrice.toFixed(0)} MSH
                </Text>
                <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[b.status]}22` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] }]}>{b.status}</Text>
                </View>
              </View>
              {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                <View style={{ gap: 6 }}>
                  {b.status === 'PENDING' && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => updateBooking(b.id, 'CONFIRMED')}>
                      <Text style={styles.actionBtnText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => updateBooking(b.id, 'COMPLETED')}>
                      <Text style={styles.actionBtnText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => updateBooking(b.id, 'CANCELLED')}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
