import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { FeatureDto } from '@mxit2/types';

// Feature Marketplace (Phase 4) — browse real PUBLISHED Features from
// GET /features/browse. Tapping a card goes to FeatureDetailScreen, which
// owns the real purchase/install/review flow — this screen is read-only.
export default function FeatureMarketplaceScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;

  const [search, setSearch] = useState('');
  const [features, setFeatures] = useState<FeatureDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    segmentWrap: {
      marginHorizontal: SPACING.lg, marginBottom: SPACING.md, flexDirection: 'row',
      backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 4, gap: 4,
    },
    segmentBtn: { flex: 1, borderRadius: RADIUS.pill, paddingVertical: 9, alignItems: 'center' },
    segmentBtnActive: { backgroundColor: COLORS.primary },
    segmentText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
    segmentTextActive: { color: '#FFF' },
    searchWrap: {
      marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 60, gap: 10 },
    card: {
      flexDirection: 'row', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 14, alignItems: 'center',
    },
    iconWrap: {
      width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.background,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    cardBody: { flex: 1, gap: 3 },
    cardName: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
    cardCategory: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    cardDesc: { color: COLORS.textMuted, fontSize: 12.5, lineHeight: 17 },
    priceTag: { alignItems: 'flex-end', gap: 4 },
    priceText: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },
    freeText: { color: '#22C55E', fontWeight: '800', fontSize: 13 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 20 },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    emptyBody: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
    errorBox: {
      marginHorizontal: SPACING.lg, backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.35)', borderRadius: RADIUS.sm, padding: 12, marginBottom: 10,
    },
    errorText: { color: '#F87171', fontSize: 13 },
  }));

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      const res = await fetchApi(`/features/browse?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not load the Marketplace.');
      setFeatures(data as FeatureDto[]);
    } catch (e: any) {
      setError(e.message || 'Could not load the Marketplace.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(search).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchSubmit = () => {
    setLoading(true);
    load(search).finally(() => setLoading(false));
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(search).finally(() => setRefreshing(false));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Marketplace</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.segmentWrap}>
        <TouchableOpacity style={[styles.segmentBtn, styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, styles.segmentTextActive]}>Features</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segmentBtn} onPress={() => navigation.replace('BlueprintMarketplace')}>
          <Text style={styles.segmentText}>Blueprints</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearchSubmit}
          placeholder="Search Features…"
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="search"
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={features}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No published Features yet</Text>
              <Text style={styles.emptyBody}>Build one in the Feature Builder and publish it to see it here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('FeatureDetail', { featureId: item.id })}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={(item.icon as any) || 'sparkles-outline'} size={22} color={COLORS.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              <View style={styles.priceTag}>
                {item.pricingType === 'FREE' ? (
                  <Text style={styles.freeText}>FREE</Text>
                ) : (
                  <Text style={styles.priceText}>
                    {formatCurrency(item.price)}{item.pricingType === 'SUBSCRIPTION' ? '/mo' : ''}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
