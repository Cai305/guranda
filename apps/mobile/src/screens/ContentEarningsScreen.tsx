import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { GRADIENTS } from '../theme';

interface EarningItem {
  id: string;
  source: 'ccr' | 'story_sale' | 'video_gift';
  label: string;
  amount: number;
  status: string;
  when: string;
}

interface Breakdown {
  summary: { pendingThisMonth: number; nextPayoutDate: string; totalAllTime: number };
  items: EarningItem[];
}

const SOURCE_ICON: Record<EarningItem['source'], string> = {
  ccr: 'heart-outline',
  story_sale: 'pricetag-outline',
  video_gift: 'gift-outline',
};

export default function ContentEarningsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/wallets/creator-funds/breakdown', { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) setData(await res.json());
    } catch {
      // Leave prior data on screen rather than clearing it on a transient failure.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
    summaryCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg },
    summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
    summaryValue: { color: '#FFF', fontSize: 30, fontWeight: '800', marginTop: 4 },
    summaryFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
    summaryFootLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
    summaryFootValue: { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 2 },
    sectionHeader: {
      fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: COLORS.textMuted,
      textTransform: 'uppercase', paddingBottom: SPACING.sm,
    },
    row: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md,
      marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
    iconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    rowDetails: { justifyContent: 'center', gap: 2, flex: 1 },
    rowLabel: { color: COLORS.text, fontSize: TYPOGRAPHY.label.fontSize, fontWeight: '600' },
    rowDate: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.caption.fontSize },
    rowAmount: { fontSize: TYPOGRAPHY.body2.fontSize, fontWeight: '700', color: COLORS.success },
    pendingPill: { color: COLORS.gold, fontSize: 10, fontWeight: '700', marginTop: 2 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xxl, gap: SPACING.sm },
    emptyText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.body2.fontSize, textAlign: 'center' },
  }));

  const renderItem = ({ item }: { item: EarningItem }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={SOURCE_ICON[item.source] as any} size={18} color={COLORS.text} />
        </View>
        <View style={styles.rowDetails}>
          <Text style={styles.rowLabel} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.rowDate}>{new Date(item.when).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</Text>
          {item.status === 'PENDING' && <Text style={styles.pendingPill}>Pending payout</Text>}
        </View>
      </View>
      <Text style={styles.rowAmount}>+{formatCurrency(item.amount)}</Text>
    </View>
  );

  if (loading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.text} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
        ListHeaderComponent={
          data ? (
            <LinearGradient colors={GRADIENTS.golden} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pending this month</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.summary.pendingThisMonth)}</Text>
              <View style={styles.summaryFootRow}>
                <View>
                  <Text style={styles.summaryFootLabel}>Next payout</Text>
                  <Text style={styles.summaryFootValue}>
                    {new Date(data.summary.nextPayoutDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View>
                  <Text style={styles.summaryFootLabel}>Earned all-time</Text>
                  <Text style={styles.summaryFootValue}>{formatCurrency(data.summary.totalAllTime)}</Text>
                </View>
              </View>
            </LinearGradient>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nothing yet — likes, comments and ranks on your{'\n'}"of the Day" stories, story items you sell, and video{'\n'}gifts you receive all show up here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
