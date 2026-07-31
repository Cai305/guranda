import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';

export const STOKVEL_CATEGORIES = [
  'Savings Stokvel', 'Grocery Stokvel', 'Building Material Stokvel', 'Construction Stokvel',
  'Business Funding Stokvel', 'Franchise Funding Stokvel', 'Property Investment Stokvel',
  'Equipment Stokvel', 'Farming Stokvel', 'Livestock Stokvel', 'School Fees Stokvel',
  'Funeral Support Stokvel', 'Wedding/Event Stokvel', 'Church Stokvel', 'Taxi Association Stokvel',
];

type Tab = 'browse' | 'mine';

export default function FinanceHomeScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('mine');
  const [category, setCategory] = useState('All');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (currentTab: Tab, cat: string) => {
    setLoading(true);
    try {
      const endpoint = currentTab === 'mine'
        ? '/finance/stokvels/mine'
        : `/finance/stokvels${cat !== 'All' ? `?category=${encodeURIComponent(cat)}` : ''}`;
      const res = await fetchApi(endpoint);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(tab, category); }, [tab, category, load]));

  const switchTab = (next: Tab) => {
    setItems([]);
    setLoading(true);
    setTab(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'finance',
            label: 'Finance',
            icon: 'wallet',
            gradient: GRADIENTS.emerald,
            route: { name: 'Main', params: { screen: 'Life', params: { screen: 'FinanceHome' } } },
          }}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Finance</Text>
          <Text style={styles.headerSub}>Stokvels, powered by real XRPL wallets</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateStokvel')}>
          <Ionicons name="add-circle-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={GRADIENTS.golden} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <Ionicons name="trending-up" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Group savings, on-chain</Text>
        <Text style={styles.heroSub}>Every stokvel owns its own XRPL multisig wallet. Guranda never holds the funds.</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabChip, tab === 'mine' && styles.tabChipActive]} onPress={() => switchTab('mine')}>
          <Ionicons name="people" size={14} color={tab === 'mine' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabLabel, tab === 'mine' && styles.tabLabelActive]}>My Stokvels</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabChip, tab === 'browse' && styles.tabChipActive]} onPress={() => switchTab('browse')}>
          <Ionicons name="compass" size={14} color={tab === 'browse' ? '#fff' : COLORS.textMuted} />
          <Text style={[styles.tabLabel, tab === 'browse' && styles.tabLabelActive]}>Browse</Text>
        </TouchableOpacity>
      </View>

      {tab === 'browse' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {['All', ...STOKVEL_CATEGORIES].map(cat => (
            <TouchableOpacity key={cat} style={[styles.filterChip, category === cat && styles.filterChipActive]} onPress={() => setCategory(cat)}>
              <Text style={[styles.filterText, category === cat && styles.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trending-up-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{tab === 'mine' ? "You haven't joined a stokvel yet" : 'No stokvels in this category yet'}</Text>
            {tab === 'mine' && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateStokvel')}>
                <Text style={styles.emptyBtnText}>Create a stokvel</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 10 }}>
            {items.map(s => (
              <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('StokvelDetail', { stokvelId: s.id })}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="trending-up" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{s.category}</Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMetaText}>{s._count?.members ?? 0} member{(s._count?.members ?? 0) === 1 ? '' : 's'}</Text>
                    {s.myRole && (
                      <View style={styles.rolePill}><Text style={styles.rolePillText}>{s.myRole}</Text></View>
                    )}
                  </View>
                </View>
                <Text style={styles.cardAmount}>{s.contributionAmount} XRP</Text>
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
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 8, marginBottom: 12 },
  tabChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  tabChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  tabLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#fff' },
  filterScroll: { marginBottom: 12 },
  filterContent: { paddingHorizontal: SPACING.lg, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' },
  filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#F59E0B' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F59E0B15', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  cardSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMetaText: { color: COLORS.textMuted, fontSize: 11 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#F59E0B22' },
  rolePillText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  cardAmount: { color: '#F59E0B', fontWeight: '800', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: SPACING.lg },
  emptyBtn: { backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
