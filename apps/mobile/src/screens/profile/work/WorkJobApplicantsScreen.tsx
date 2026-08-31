import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

const STATUSES = ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'];

export default function WorkJobApplicantsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const STATUS_COLOR: Record<string, string> = {
    PENDING: COLORS.textMuted,
    REVIEWED: '#0EA5E9',
    ACCEPTED: '#22c55e',
    REJECTED: '#ef4444',
  };
  const { jobId, jobTitle } = route.params;
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/work/jobs/${jobId}/applicants`);
      const data = await res.json();
      setApplicants(Array.isArray(data) ? data : []);
    } catch { setApplicants([]); }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      await fetchApi(`/work/applications/${applicationId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setApplicants(prev => prev.map(a => a.id === applicationId ? { ...a, status } : a));
    } catch {}
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    name: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '700' },
    message: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
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
        <Text style={styles.headerTitle} numberOfLines={1}>{jobTitle || 'Applicants'}</Text>
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
          {applicants.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No applicants yet</Text>
            </View>
          ) : (
            applicants.map(app => (
              <View key={app.id} style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.name}>{app.applicant?.profile?.displayName || app.applicant?.username}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[app.status]}22` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[app.status] }]}>{app.status}</Text>
                  </View>
                </View>
                {app.coverMessage && <Text style={styles.message}>{app.coverMessage}</Text>}
                <View style={styles.actionRow}>
                  {STATUSES.filter(s => s !== app.status).map(s => (
                    <TouchableOpacity key={s} style={styles.statusBtn} onPress={() => updateStatus(app.id, s)}>
                      <Text style={styles.statusBtnText}>{s}</Text>
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
