import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';
import { formatCurrency } from '../../../utils/format';

const STATUSES = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_COLOR: Record<string, string> = { CONFIRMED: '#0EA5E9', COMPLETED: '#22c55e', CANCELLED: '#ef4444' };

export default function TutorSessionsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const tutorRes = await fetchApi('/learning/tutors/mine');
      const tutor = tutorRes.ok ? await tutorRes.json() : null;
      if (!tutor) { setSessions([]); setLoading(false); return; }
      const res = await fetchApi(`/learning/tutors/${tutor.id}/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { setSessions([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadSessions(); }, [loadSessions]));

  const updateStatus = async (sessionId: string, status: string) => {
    try {
      await fetchApi(`/learning/sessions/${sessionId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s));
    } catch {}
  };

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    cardSub: { color: COLORS.textMuted, fontSize: 12 },
    cardMeta: { color: COLORS.textMuted, fontSize: 11 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '700' },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    statusBtn: { backgroundColor: COLORS.surfaceElevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    statusBtnText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tutoring Sessions</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSessions} tintColor={COLORS.primary} />}
        >
          {sessions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No sessions booked yet</Text>
            </View>
          ) : (
            sessions.map(s => (
              <View key={s.id} style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.cardTitle}>{s.student?.profile?.displayName || s.student?.username}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[s.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[s.status] }]}>{s.status}</Text>
                  </View>
                </View>
                {s.topic && <Text style={styles.cardSub}>{s.topic}</Text>}
                <Text style={styles.cardMeta}>{new Date(s.scheduledAt).toLocaleString()} · {formatCurrency(s.fee)}</Text>
                <View style={styles.actionRow}>
                  {STATUSES.filter(st => st !== s.status).map(st => (
                    <TouchableOpacity key={st} style={styles.statusBtn} onPress={() => updateStatus(s.id, st)}>
                      <Text style={styles.statusBtnText}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
