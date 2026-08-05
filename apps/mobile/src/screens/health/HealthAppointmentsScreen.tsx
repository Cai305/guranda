import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#0EA5E9',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
};

export default function HealthAppointmentsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/health/appointments/mine');
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch { setAppointments([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
      padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10,
    },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    sub: { color: '#F87171', fontSize: 12, fontWeight: '600', marginBottom: 4 },
    date: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
    reason: { color: COLORS.textMuted, fontSize: 12 },
    fee: { color: '#F87171', fontWeight: '800', fontSize: 14 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {appointments.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No appointments yet</Text>
            </View>
          ) : (
            appointments.map(appt => (
              <View key={appt.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{appt.practitioner?.name}</Text>
                  <Text style={styles.sub}>{appt.practitioner?.specialty}</Text>
                  <Text style={styles.date}>{new Date(appt.scheduledAt).toLocaleString()}</Text>
                  {appt.reason && <Text style={styles.reason}>{appt.reason}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.fee}>{appt.fee.toFixed(0)} MSH</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[appt.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[appt.status] }]}>{appt.status}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
