import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

export default function WorkJobDetailScreen({ navigation, route }: any) {
  const { jobId } = route.params;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coverMessage, setCoverMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    fetchApi(`/work/jobs/${jobId}`).then(r => r.json()).then(setJob).catch(() => {}).finally(() => setLoading(false));
  }, [jobId]);

  const apply = async () => {
    setError('');
    setApplying(true);
    try {
      const res = await fetchApi(`/work/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverMessage: coverMessage.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to apply');
      }
      setApplied(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!job) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Job not found</Text></View>;

  const salary = job.salaryMin || job.salaryMax
    ? job.salaryMin && job.salaryMax ? `${job.salaryMin.toFixed(0)}–${job.salaryMax.toFixed(0)} MSH` : `${(job.salaryMin || job.salaryMax).toFixed(0)} MSH`
    : null;

  if (applied) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color="#fff" /></View>
          <Text style={styles.successTitle}>Application sent!</Text>
          <Text style={styles.successSub}>{job.title} at {job.company?.name}</Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('WorkApplications')}>
            <Text style={styles.successBtnText}>View My Applications</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.successLink}>Back to browsing</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>Job details</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        <Text style={styles.title}>{job.title}</Text>
        <TouchableOpacity
          style={styles.companyRow}
          onPress={() => navigation.navigate('WorkCompanyDetail', { companyId: job.company.id })}
        >
          <Ionicons name="business" size={14} color="#0EA5E9" />
          <Text style={styles.companyText}>{job.company?.name}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, job.locationType === 'Remote' && styles.remoteBadge]}>
            <Ionicons name="location-outline" size={13} color={job.locationType === 'Remote' ? '#22c55e' : COLORS.text} />
            <Text style={[styles.badgeText, job.locationType === 'Remote' && { color: '#22c55e' }]}>
              {job.locationType}{job.location ? ` · ${job.location}` : ''}
            </Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={13} color={COLORS.text} />
            <Text style={styles.badgeText}>{job.employmentType}</Text>
          </View>
        </View>

        {salary && (
          <Text style={styles.salary}>{salary}</Text>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.desc}>{job.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cover message (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 90 }]}
            placeholder="Tell them why you're a great fit…"
            placeholderTextColor={COLORS.textMuted}
            value={coverMessage}
            onChangeText={setCoverMessage}
            multiline
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.applyBtn} onPress={apply} disabled={applying}>
          {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Apply Now</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  title: { ...TYPOGRAPHY.h2, marginBottom: 10 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  companyText: { color: '#0EA5E9', fontSize: 13, fontWeight: '600', flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  remoteBadge: { borderColor: '#22c55e40' },
  badgeText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  salary: { color: '#0EA5E9', fontWeight: '800', fontSize: 20, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
  desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 13 },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  applyBtn: { backgroundColor: '#0EA5E9', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successTitle: { ...TYPOGRAPHY.h2 },
  successSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  successBtn: { backgroundColor: '#0EA5E9', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successLink: { color: COLORS.textMuted, fontSize: 13, marginTop: 12 },
});
