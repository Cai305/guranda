import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

export default function MyCompanyScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/work/companies/mine');
      const data = await res.json();
      setCompany(data?.id ? data : null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: SPACING.lg },
    emptyTitle: { ...TYPOGRAPHY.h2 },
    emptySub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
    createBtn: { backgroundColor: '#0EA5E9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    freelanceLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 30 },
    freelanceLinkText: { color: '#8B5CF6', fontSize: 13, fontWeight: '600' },
    companyCard: { margin: SPACING.lg, borderRadius: 16, padding: 18, gap: 12 },
    companyName: { color: '#fff', fontSize: 20, fontWeight: '800' },
    companyIndustry: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
    stat: { alignItems: 'center' },
    statNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    actions: { flexDirection: 'row', gap: 12, paddingHorizontal: SPACING.lg, marginBottom: 16 },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
      justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    actionText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginBottom: 10 },
    emptyJobs: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    emptyJobsText: { color: COLORS.textMuted, fontSize: 13 },
    jobRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12,
      padding: 14, marginHorizontal: SPACING.lg, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 10,
    },
    jobTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
    jobMeta: { color: COLORS.textMuted, fontSize: 12 },
    applicantBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0EA5E915', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    applicantBadgeText: { color: '#0EA5E9', fontWeight: '700', fontSize: 12 },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (!company) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Company</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="business-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No company yet</Text>
          <Text style={styles.emptySub}>Register a company to start posting jobs and hiring talent.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('AddEditWorkCompany', {})}>
            <Text style={styles.createBtnText}>Register my company</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.freelanceLink} onPress={() => navigation.navigate('MyFreelanceWork')}>
          <Ionicons name="construct-outline" size={16} color="#8B5CF6" />
          <Text style={styles.freelanceLinkText}>Looking for freelance work instead?</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{company.name}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddEditWorkCompany', { company })}>
          <Ionicons name="create-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
      >
        <LinearGradient colors={GRADIENTS.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.companyCard}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyIndustry}>{company.industry || 'Business'}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{company.jobs?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Jobs Posted</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{company.jobs?.filter((j: any) => j.status === 'OPEN').length ?? 0}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddEditWorkJob', {})}>
            <Ionicons name="add-circle" size={20} color="#0EA5E9" />
            <Text style={styles.actionText}>Post a Job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MyGigs')}>
            <Ionicons name="construct" size={20} color="#8B5CF6" />
            <Text style={styles.actionText}>My Gigs</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>JOB POSTINGS ({company.jobs?.length ?? 0})</Text>
        {(company.jobs || []).length === 0 ? (
          <View style={styles.emptyJobs}>
            <Ionicons name="briefcase-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyJobsText}>No jobs posted yet</Text>
          </View>
        ) : (
          company.jobs.map((job: any) => (
            <TouchableOpacity key={job.id} style={styles.jobRow} onPress={() => navigation.navigate('WorkJobApplicants', { jobId: job.id, jobTitle: job.title })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobMeta}>{job.locationType} · {job.status}</Text>
              </View>
              <View style={styles.applicantBadge}>
                <Ionicons name="people" size={14} color="#0EA5E9" />
                <Text style={styles.applicantBadgeText}>{job._count?.applications ?? 0}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
