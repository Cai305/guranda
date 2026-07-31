import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

type Tab = 'fitness' | 'doctors' | 'pharmacy' | 'wellness';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'fitness', label: 'Fitness', icon: 'fitness' },
  { key: 'doctors', label: 'Doctors', icon: 'medkit' },
  { key: 'pharmacy', label: 'Pharmacy', icon: 'medical' },
  { key: 'wellness', label: 'Wellness', icon: 'leaf' },
];

const LOG_ICON: Record<string, string> = { workout: 'barbell', weight: 'scale', steps: 'walk', water: 'water' };

export default function HealthHomeScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('fitness');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [fitnessLoading, setFitnessLoading] = useState(true);

  const loadFitness = useCallback(async () => {
    setFitnessLoading(true);
    try {
      const [s, l] = await Promise.all([
        fetchApi('/health/fitness/summary').then(r => r.json()),
        fetchApi('/health/fitness/logs/mine').then(r => r.json()),
      ]);
      setSummary(s);
      setLogs(Array.isArray(l) ? l : []);
    } catch { setSummary(null); setLogs([]); }
    setFitnessLoading(false);
  }, []);

  const loadBrowse = useCallback(async (currentTab: Tab, query: string) => {
    setLoading(true);
    try {
      const endpoint = currentTab === 'doctors' ? '/health/practitioners' : currentTab === 'pharmacy' ? '/health/products' : '/health/wellness';
      const params = new URLSearchParams();
      if (query && currentTab === 'pharmacy') params.set('search', query);
      const qs = params.toString();
      const res = await fetchApi(`${endpoint}${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'fitness') return;
    const t = setTimeout(() => loadBrowse(tab, search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [tab, search, loadBrowse]);

  useFocusEffect(useCallback(() => {
    if (tab === 'fitness') loadFitness();
  }, [tab, loadFitness]));

  const switchTab = (next: Tab) => {
    setItems([]);
    setLoading(true);
    setTab(next);
  };

  const openDetail = (item: any) => {
    if (tab === 'doctors') navigation.navigate('HealthPractitionerDetail', { practitionerId: item.id });
    else if (tab === 'pharmacy') navigation.navigate('HealthPharmacyDetail', { pharmacyId: item.pharmacy.id });
    else if (tab === 'wellness') navigation.navigate('HealthWellnessDetail', { postId: item.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'health',
            label: 'Health',
            icon: 'fitness',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'HealthHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Health</Text>
          <Text style={styles.headerSub}>Your wellbeing, connected</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('HealthAppointments')}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('HealthOrders')}>
          <Ionicons name="receipt-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="heart" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Your wellbeing, connected</Text>
        <Text style={styles.heroSub}>Track fitness, book doctors, shop the pharmacy — all in one place</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => switchTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={14} color={tab === t.key ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab !== 'fitness' && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={tab === 'doctors' ? 'Search by specialty…' : tab === 'pharmacy' ? 'Search products…' : 'Search wellness posts…'}
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {tab === 'doctors' && (
        <TouchableOpacity style={styles.hostLink} onPress={() => navigation.navigate('MyPractitioner')}>
          <Ionicons name="medkit-outline" size={14} color="#F87171" />
          <Text style={styles.hostLinkText}>Register as a practitioner</Text>
        </TouchableOpacity>
      )}
      {tab === 'pharmacy' && (
        <TouchableOpacity style={styles.hostLink} onPress={() => navigation.navigate('MyPharmacy')}>
          <Ionicons name="medical-outline" size={14} color="#F87171" />
          <Text style={styles.hostLinkText}>Open a pharmacy</Text>
        </TouchableOpacity>
      )}
      {tab === 'wellness' && (
        <TouchableOpacity style={styles.hostLink} onPress={() => navigation.navigate('AddWellnessPost')}>
          <Ionicons name="add-circle-outline" size={14} color="#F87171" />
          <Text style={styles.hostLinkText}>Share a wellness tip</Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {tab === 'fitness' ? (
          fitnessLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ paddingHorizontal: SPACING.lg }}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary?.workoutCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Workouts</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary?.latestWeight?.value ?? '—'}</Text>
                  <Text style={styles.statLabel}>Weight ({summary?.latestWeight?.unit || 'kg'})</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary?.stepsToday ?? 0}</Text>
                  <Text style={styles.statLabel}>Steps today</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary?.waterTodayMl ?? 0}</Text>
                  <Text style={styles.statLabel}>Water (ml)</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.addLogBtn} onPress={() => navigation.navigate('HealthAddLog')}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addLogBtnText}>Log an entry</Text>
              </TouchableOpacity>

              <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
              {logs.length === 0 ? (
                <Text style={styles.hint}>Nothing logged yet — add your first entry above.</Text>
              ) : (
                logs.slice(0, 20).map(log => (
                  <View key={log.id} style={styles.logRow}>
                    <View style={styles.logIconWrap}>
                      <Ionicons name={(LOG_ICON[log.type] || 'pulse') as any} size={18} color="#F87171" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logType}>{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</Text>
                      {log.note && <Text style={styles.logNote}>{log.note}</Text>}
                    </View>
                    <Text style={styles.logValue}>{log.value} {log.unit}</Text>
                  </View>
                ))
              )}
            </View>
          )
        ) : loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="medkit-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nothing here yet</Text>
          </View>
        ) : tab === 'doctors' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(p => (
              <TouchableOpacity key={p.id} style={styles.card} activeOpacity={0.85} onPress={() => openDetail(p)}>
                {p.avatarUrl ? <Image source={{ uri: p.avatarUrl }} style={styles.avatar} /> : (
                  <View style={styles.avatarPlaceholder}><Ionicons name="medkit" size={20} color="#F87171" /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.name}</Text>
                  <Text style={styles.cardSub}>{p.specialty}</Text>
                </View>
                <Text style={styles.cardPrice}>{p.consultationFee.toFixed(0)} MSH</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : tab === 'pharmacy' ? (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(prod => (
              <TouchableOpacity key={prod.id} style={styles.card} activeOpacity={0.85} onPress={() => openDetail(prod)}>
                {prod.imageUrl ? <Image source={{ uri: prod.imageUrl }} style={styles.avatar} /> : (
                  <View style={styles.avatarPlaceholder}><Ionicons name="medical" size={20} color="#F87171" /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{prod.name}</Text>
                  <Text style={styles.cardSub}>{prod.pharmacy?.name}</Text>
                </View>
                <Text style={styles.cardPrice}>{prod.price.toFixed(0)} MSH</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(post => (
              <TouchableOpacity key={post.id} style={styles.wellnessCard} activeOpacity={0.85} onPress={() => openDetail(post)}>
                <View style={styles.wellnessCatPill}>
                  <Text style={styles.wellnessCatText}>{post.category}</Text>
                </View>
                <Text style={styles.cardTitle}>{post.title}</Text>
                <Text style={styles.cardSub} numberOfLines={2}>{post.description}</Text>
                <View style={styles.wellnessMetaRow}>
                  <Ionicons name="heart" size={13} color="#F87171" />
                  <Text style={styles.wellnessMetaText}>{post._count?.likes ?? 0}</Text>
                  <Text style={styles.wellnessMetaText}>· {post.author?.profile?.displayName || post.author?.username}</Text>
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
  hero: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
  heroIcon: { position: 'absolute', right: 16, top: 12 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 12 },
  tabChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  tabChipActive: { backgroundColor: '#F87171', borderColor: '#F87171' },
  tabLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: '#fff' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, marginBottom: 12,
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  hostLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginRight: SPACING.lg, marginBottom: 10 },
  hostLinkText: { color: '#F87171', fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  statValue: { color: '#F87171', fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  addLogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F87171', borderRadius: 14, paddingVertical: 13, marginBottom: 20,
  },
  addLogBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
  hint: { color: COLORS.textMuted, fontSize: 13 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  logIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8717115', justifyContent: 'center', alignItems: 'center' },
  logType: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  logNote: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  logValue: { color: '#F87171', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8717115', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  cardSub: { color: COLORS.textMuted, fontSize: 12 },
  cardPrice: { color: '#F87171', fontWeight: '800', fontSize: 14 },
  wellnessCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  wellnessCatPill: { alignSelf: 'flex-start', backgroundColor: '#F8717122', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 },
  wellnessCatText: { color: '#F87171', fontSize: 10, fontWeight: '700' },
  wellnessMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  wellnessMetaText: { color: COLORS.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});
