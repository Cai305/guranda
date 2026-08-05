import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

export default function WorkCompanyDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const { companyId } = route.params;
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/work/companies/${companyId}`).then(r => r.json()).then(setCompany).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    logo: { width: 64, height: 64, borderRadius: 16 },
    logoPlaceholder: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#0EA5E915', justifyContent: 'center', alignItems: 'center' },
    name: { ...TYPOGRAPHY.h2, marginBottom: 2 },
    industry: { color: '#0EA5E9', fontSize: 12, fontWeight: '600' },
    desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 12 },
    websiteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    website: { color: '#0EA5E9', fontSize: 13 },
    section: { marginTop: 8 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    hint: { color: COLORS.textMuted, fontSize: 13 },
    jobRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12,
      padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
    },
    jobTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
    jobMeta: { color: COLORS.textMuted, fontSize: 12 },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!company) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Company not found</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Company</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        <View style={styles.topRow}>
          {company.logoUrl ? (
            <Image source={{ uri: company.logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="business" size={28} color="#0EA5E9" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{company.name}</Text>
            {company.industry && <Text style={styles.industry}>{company.industry}</Text>}
          </View>
        </View>

        {company.description && <Text style={styles.desc}>{company.description}</Text>}

        {company.website && (
          <TouchableOpacity style={styles.websiteRow} onPress={() => Linking.openURL(company.website)}>
            <Ionicons name="link" size={14} color="#0EA5E9" />
            <Text style={styles.website}>{company.website}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OPEN ROLES ({company.jobs?.length ?? 0})</Text>
          {(company.jobs || []).length === 0 ? (
            <Text style={styles.hint}>No open roles right now.</Text>
          ) : (
            company.jobs.map((job: any) => (
              <TouchableOpacity key={job.id} style={styles.jobRow} onPress={() => navigation.navigate('WorkJobDetail', { jobId: job.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobMeta}>{job.locationType} · {job.employmentType}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
