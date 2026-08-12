import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import { formatCurrency } from '../../utils/format';

type Tab = 'jobs' | 'gigs' | 'companies';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'jobs', label: 'Jobs', icon: 'briefcase' },
  { key: 'gigs', label: 'Freelance', icon: 'construct' },
  { key: 'companies', label: 'Companies', icon: 'business' },
];

const LOCATION_FILTERS = ['All', 'Remote', 'Onsite', 'Hybrid'];

const salaryLabel = (min?: number | null, max?: number | null) => {
  if (!min && !max) return null;
  if (min && max) return `${formatCurrency(min)}–${formatCurrency(max)}`;
  return formatCurrency((min || max)!);
};

export default function WorkHomeScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('jobs');
  const [locationFilter, setLocationFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (currentTab: Tab, query: string, location: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (currentTab === 'jobs' && location !== 'All') params.set('locationType', location);
      const qs = params.toString();
      const endpoint = { jobs: '/work/jobs', gigs: '/work/gigs', companies: '/work/companies' }[currentTab];
      const res = await fetchApi(`${endpoint}${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(tab, search, locationFilter), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, search, locationFilter, load]);

  const switchTab = (next: Tab) => {
    setItems([]);
    setLoading(true);
    setTab(next);
  };

  const openDetail = (item: any) => {
    if (tab === 'jobs') navigation.navigate('WorkJobDetail', { jobId: item.id });
    else if (tab === 'gigs') navigation.navigate('WorkGigDetail', { gigId: item.id });
    else navigation.navigate('WorkCompanyDetail', { companyId: item.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'work',
            label: 'Work',
            icon: 'briefcase',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'WorkHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Work</Text>
          <Text style={styles.headerSub}>Jobs, freelancing & businesses</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('WorkApplications')}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('MyCompany')}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={tab === 'companies' ? 'Search companies…' : 'Search by title…'}
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <LinearGradient colors={GRADIENTS.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="briefcase" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Earn inside your digital life</Text>
        <Text style={styles.heroSub}>Jobs, freelance gigs and businesses — powered by your Guranda identity</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => switchTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'jobs' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {LOCATION_FILTERS.map(loc => (
            <TouchableOpacity
              key={loc}
              style={[styles.filterChip, locationFilter === loc && styles.filterChipActive]}
              onPress={() => setLocationFilter(loc)}
            >
              <Text style={[styles.filterText, locationFilter === loc && styles.filterTextActive]}>{loc}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Try a different search or check back soon</Text>
          </View>
        ) : tab === 'jobs' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(job => (
              <TouchableOpacity key={job.id} style={styles.jobCard} activeOpacity={0.85} onPress={() => openDetail(job)}>
                <View style={styles.jobIconWrap}>
                  <Ionicons name="briefcase" size={20} color="#0EA5E9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.jobCompany} numberOfLines={1}>{job.company?.name}</Text>
                  <View style={styles.jobMetaRow}>
                    <View style={[styles.locationPill, job.locationType === 'Remote' && styles.remotePill]}>
                      <Text style={[styles.locationPillText, job.locationType === 'Remote' && styles.remotePillText]}>{job.locationType}</Text>
                    </View>
                    <Text style={styles.jobMetaText}>{job.employmentType}</Text>
                  </View>
                  {salaryLabel(job.salaryMin, job.salaryMax) && (
                    <Text style={styles.jobSalary}>{salaryLabel(job.salaryMin, job.salaryMax)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : tab === 'gigs' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(gig => (
              <TouchableOpacity key={gig.id} style={styles.jobCard} activeOpacity={0.85} onPress={() => openDetail(gig)}>
                <View style={[styles.jobIconWrap, { backgroundColor: '#8B5CF615' }]}>
                  <Ionicons name="construct" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{gig.title}</Text>
                  <Text style={styles.jobCompany} numberOfLines={2}>{gig.description}</Text>
                  <Text style={styles.jobMetaText}>{gig._count?.proposals ?? 0} proposal{gig._count?.proposals === 1 ? '' : 's'}</Text>
                </View>
                <Text style={styles.gigBudget}>{formatCurrency(gig.budget)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(company => (
              <TouchableOpacity key={company.id} style={styles.companyCard} activeOpacity={0.85} onPress={() => openDetail(company)}>
                {company.logoUrl ? (
                  <Image source={{ uri: company.logoUrl }} style={styles.companyLogo} />
                ) : (
                  <View style={styles.companyLogoPlaceholder}>
                    <Ionicons name="business" size={22} color="#0EA5E9" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{company.name}</Text>
                  <Text style={styles.jobCompany} numberOfLines={1}>{company.industry || 'Business'}</Text>
                  <Text style={styles.jobMetaText}>{company._count?.jobs ?? 0} open role{company._count?.jobs === 1 ? '' : 's'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 4 },
  back: { padding: 4, marginRight: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { ...TYPOGRAPHY.h2 },
  headerSub: { color: COLORS.textMuted, fontSize: 12 },
  iconBtn: { padding: 6 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, marginBottom: 12,
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  hero: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
  heroIcon: { position: 'absolute', right: 16, top: 12 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 12 },
  tabChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  tabChipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  tabLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#fff' },
  filterScroll: { marginBottom: 12 },
  filterContent: { paddingHorizontal: SPACING.lg, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: '#0EA5E922', borderColor: '#0EA5E9' },
  filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#0EA5E9' },
  jobCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  jobIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#0EA5E915', justifyContent: 'center', alignItems: 'center' },
  jobTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  jobCompany: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: COLORS.surfaceElevated },
  remotePill: { backgroundColor: '#22c55e22' },
  locationPillText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  remotePillText: { color: '#22c55e' },
  jobMetaText: { color: COLORS.textMuted, fontSize: 11 },
  jobSalary: { color: '#0EA5E9', fontWeight: '700', fontSize: 13, marginTop: 4 },
  gigBudget: { color: '#8B5CF6', fontWeight: '800', fontSize: 15 },
  companyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  companyLogo: { width: 44, height: 44, borderRadius: 12 },
  companyLogoPlaceholder: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0EA5E915', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySub: { color: COLORS.textMuted, fontSize: 13 },
});
