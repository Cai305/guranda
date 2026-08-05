import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

const STATUS_COLOR: Record<string, string> = { CONFIRMED: '#0EA5E9', COMPLETED: '#22c55e', CANCELLED: '#ef4444' };

export default function MyPractitionerScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const [practitioner, setPractitioner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/health/practitioners/mine');
      const data = await res.json();
      setPractitioner(data?.id ? data : null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (appointmentId: string, status: string) => {
    try {
      await fetchApi(`/health/appointments/${appointmentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setPractitioner((p: any) => ({ ...p, appointments: p.appointments.map((a: any) => a.id === appointmentId ? { ...a, status } : a) }));
    } catch {}
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: SPACING.lg },
    emptyTitle: { ...TYPOGRAPHY.h2 },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
    createBtn: { backgroundColor: '#F87171', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    card: { margin: SPACING.lg, borderRadius: 16, padding: 18, gap: 12 },
    cardName: { color: '#fff', fontSize: 20, fontWeight: '800' },
    cardSpecialty: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
    stat: { alignItems: 'center' },
    statNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginBottom: 10 },
    emptyAppts: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    emptyApptsText: { color: COLORS.textMuted, fontSize: 13 },
    apptRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12,
      padding: 14, marginHorizontal: SPACING.lg, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 10,
    },
    apptDate: { color: COLORS.text, fontWeight: '600', fontSize: 13, marginBottom: 2 },
    apptReason: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
    statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    actionBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    cancelBtn: { backgroundColor: '#ef444422', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    cancelBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (!practitioner) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Practice</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="medkit-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Not registered yet</Text>
          <Text style={styles.emptySub}>Register as a practitioner to start taking bookings.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('AddEditHealthPractitioner', {})}>
            <Text style={styles.createBtnText}>Register my practice</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{practitioner.name}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddEditHealthPractitioner', { practitioner })}>
          <Ionicons name="create-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
      >
        <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <Text style={styles.cardName}>{practitioner.name}</Text>
          <Text style={styles.cardSpecialty}>{practitioner.specialty}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{practitioner.appointments?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Appointments</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{practitioner.consultationFee.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Fee (MSH)</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionLabel}>APPOINTMENTS ({practitioner.appointments?.length ?? 0})</Text>
        {(practitioner.appointments || []).length === 0 ? (
          <View style={styles.emptyAppts}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyApptsText}>No appointments yet</Text>
          </View>
        ) : (
          practitioner.appointments.map((appt: any) => (
            <View key={appt.id} style={styles.apptRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.apptDate}>{new Date(appt.scheduledAt).toLocaleString()}</Text>
                {appt.reason && <Text style={styles.apptReason}>{appt.reason}</Text>}
                <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[appt.status]}22` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[appt.status] }]}>{appt.status}</Text>
                </View>
              </View>
              {appt.status === 'CONFIRMED' && (
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(appt.id, 'COMPLETED')}>
                    <Text style={styles.actionBtnText}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => updateStatus(appt.id, 'CANCELLED')}>
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
