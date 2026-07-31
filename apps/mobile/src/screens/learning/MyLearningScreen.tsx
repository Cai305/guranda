import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';
import { ACCENT } from './LearningHomeScreen';

type Tab = 'enrollments' | 'certificates';

export default function MyLearningScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('enrollments');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([
        fetchApi('/learning/enrollments/mine').then(r => r.json()),
        fetchApi('/learning/certificates/mine').then(r => r.json()),
      ]);
      setEnrollments(Array.isArray(e) ? e : []);
      setCertificates(Array.isArray(c) ? c : []);
    } catch { setEnrollments([]); setCertificates([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Learning</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabChip, tab === 'enrollments' && styles.tabChipActive]} onPress={() => setTab('enrollments')}>
          <Text style={[styles.tabLabel, tab === 'enrollments' && styles.tabLabelActive]}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabChip, tab === 'certificates' && styles.tabChipActive]} onPress={() => setTab('certificates')}>
          <Text style={[styles.tabLabel, tab === 'certificates' && styles.tabLabelActive]}>Certificates</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
        >
          {tab === 'enrollments' ? (
            enrollments.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No enrollments yet</Text>
              </View>
            ) : (
              enrollments.map(e => (
                <TouchableOpacity key={e.id} style={styles.card} onPress={() => navigation.navigate('CourseDetail', { courseId: e.courseId })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{e.course.title}</Text>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${e.progressPct}%` }]} />
                    </View>
                    <Text style={styles.cardMeta}>{e.progressPct}% complete {e.certificate ? '· Certified' : ''}</Text>
                  </View>
                  {e.certificate && <Ionicons name="ribbon" size={20} color="#22c55e" />}
                </TouchableOpacity>
              ))
            )
          ) : (
            certificates.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="ribbon-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No certificates yet</Text>
              </View>
            ) : (
              certificates.map(c => (
                <View key={c.id} style={styles.certCard}>
                  <Ionicons name="ribbon" size={28} color="#22c55e" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{c.enrollment.course.title}</Text>
                    <Text style={styles.certCode}>Code: {c.certificateCode}</Text>
                    <Text style={styles.cardMeta}>Issued {new Date(c.issuedAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 12 },
  tabChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  tabChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  cardMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceElevated, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: ACCENT },
  certCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  certCode: { color: ACCENT, fontSize: 11, fontWeight: '700', marginTop: 2, fontFamily: 'monospace' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
});
