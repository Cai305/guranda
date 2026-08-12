import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../../theme';
import { fetchApi } from '../../utils/api';
import SessionHeaderActions from '../../components/SessionHeaderActions';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../utils/format';

const LEVEL_COLOR: Record<string, string> = {
  Nano: '#6B7280', Micro: '#10B981', Midtier: '#3B82F6', Macro: '#A78BFA', 'Mega Influencer': '#F59E0B',
};

export default function UsernameMarketHomeScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [usernames, setUsernames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    fetchApi(`/usernames/browse${qs}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setUsernames(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: any }) => {
    const isAuction = item.saleStatus === 'AUCTION';
    const displayPrice = isAuction ? (item.currentBid ?? item.price) : item.price;
    const levelColor = LEVEL_COLOR[item.level] || '#6B7280';
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('UsernameDetail', { usernameId: item.id })}
        style={styles.cardWrapper}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel} numberOfLines={1}>@{item.label}</Text>
            {isAuction && (
              <View style={styles.auctionBadge}>
                <Ionicons name="hammer" size={10} color="#FFF" />
                <Text style={styles.auctionBadgeText}>AUCTION</Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.cardPriceLabel}>{isAuction ? (item.currentBid ? 'Current bid' : 'Starting at') : 'Buy now'}</Text>
            <Text style={styles.cardPriceValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(displayPrice)}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={[styles.levelPill, {
              borderColor: levelColor + '88',
              backgroundColor: levelColor + '22',
            }]}>
              <Ionicons name="star" size={10} color={levelColor} />
              <Text style={[styles.levelText, { color: levelColor }]}>{item.level}</Text>
            </View>
            <Text style={styles.cardMeta} numberOfLines={1}>
              seller: @{item.owner?.username || 'unknown'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <SessionHeaderActions
          navigation={navigation}
          session={{
            id: 'username-market',
            label: 'Username Market',
            icon: 'at',
            gradient: GRADIENTS.emerald,
            route: { name: 'UsernameMarketHome' },
          }}
        />
        <Text style={TYPOGRAPHY.h2}>Username Market</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.dashRow}>
        <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('MyUsernames')}>
          <Ionicons name="at" size={16} color="#A78BFA" />
          <Text style={styles.dashText}>My Usernames</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search usernames…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={usernames}
        keyExtractor={u => u.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading usernames…' : 'No usernames for sale yet — list one of yours!'}
          </Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MyUsernames')}>
        <Ionicons name="add" size={26} color="#FFF" />
        <Text style={styles.fabText}>Sell a username</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#150A2E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  dashRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg },
  dashBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
    borderRadius: RADIUS.lg, paddingVertical: 12,
  },
  dashText: { color: '#A78BFA', fontWeight: '800', fontSize: 12.5 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.glassBorder,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13.5 },
  cardWrapper: {
    width: '100%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  card: {
    padding: 18,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
    flex: 1,
    letterSpacing: 0.3,
  },
  auctionBadge: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: '#F59E0B', borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  auctionBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  priceRow: {
    marginTop: 14,
    marginBottom: 12,
  },
  cardPriceLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardPriceValue: {
    color: '#C4B5FD',
    fontWeight: '900',
    fontSize: 24,
  },
  cardPriceUnit: {
    color: 'rgba(196,181,253,0.7)',
    fontWeight: '800',
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  cardMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: '#7C3AED', borderRadius: RADIUS.pill,
    paddingVertical: 13, paddingHorizontal: 18,
  },
  fabText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
