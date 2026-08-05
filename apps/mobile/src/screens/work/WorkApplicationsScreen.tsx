import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

export default function WorkApplicationsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;

  const STATUS_COLOR: Record<string, string> = {
    PENDING: COLORS.textMuted,
    REVIEWED: '#0EA5E9',
    ACCEPTED: '#22c55e',
    REJECTED: '#ef4444',
  };

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/work/applications/mine');
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch { setApplications([]); }
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
    jobTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    company: { color: COLORS.textMuted, fontSize: 12 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Applications</Text>
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
          {applications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No applications yet</Text>
            </View>
          ) : (
            applications.map(app => (
              <TouchableOpacity key={app.id} style={styles.card} onPress={() => navigation.navigate('WorkJobDetail', { jobId: app.job.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle}>{app.job.title}</Text>
                  <Text style={styles.company}>{app.job.company?.name}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[app.status]}22` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[app.status] }]}>{app.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
