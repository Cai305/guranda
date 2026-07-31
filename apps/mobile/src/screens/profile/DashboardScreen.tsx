import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, GRADIENTS, SHADOW } from '../../theme';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 7;

const GIFT_EMOJI: Record<string, string> = {
  rose: '🌹', heart: '💜', confetti: '🎉', trophy: '🏆', diamond: '💎', rocket: '🚀',
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}M AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H AGO`;
  return `${Math.floor(hrs / 24)}D AGO`;
}

// Buckets a seller's SOLD listings into the last CHART_DAYS days, keyed by
// day-of-week label, for the tiny bar chart below the revenue stat card.
function buildSalesChart(listings: any[]) {
  const now = Date.now();
  const buckets = Array.from({ length: CHART_DAYS }, (_, i) => {
    const dayStart = now - (CHART_DAYS - 1 - i) * DAY_MS;
    const d = new Date(dayStart);
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), count: 0, revenue: 0 };
  });
  const oldestBucketStart = now - CHART_DAYS * DAY_MS;

  for (const l of listings) {
    if (l.status !== 'SOLD' || !l.soldAt) continue;
    const soldMs = new Date(l.soldAt).getTime();
    if (soldMs < oldestBucketStart) continue;
    const dayIndex = Math.min(CHART_DAYS - 1, Math.floor((soldMs - oldestBucketStart) / DAY_MS));
    if (buckets[dayIndex]) {
      buckets[dayIndex].count += 1;
      buckets[dayIndex].revenue += Number(l.price);
    }
  }
  return buckets;
}

function SalesBarChart({ buckets }: { buckets: { label: string; count: number }[] }) {
  const width = 260;
  const height = 70;
  const barW = width / buckets.length - 8;
  const max = Math.max(1, ...buckets.map(b => b.count));

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {buckets.map((b, i) => {
          const barH = (b.count / max) * (height - 20);
          const x = i * (width / buckets.length) + 4;
          return (
            <Rect
              key={i}
              x={x}
              y={height - 16 - barH}
              width={barW}
              height={Math.max(2, barH)}
              rx={3}
              fill={b.count > 0 ? '#A78BFA' : 'rgba(255,255,255,0.1)'}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', width, justifyContent: 'space-between', marginTop: 4 }}>
        {buckets.map((b, i) => (
          <Text key={i} style={dash.chartLabel}>{b.label}</Text>
        ))}
      </View>
    </View>
  );
}

interface BentoTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  badge?: string | null;
}

// Flat dark card + colored icon chip — same visual language as the Digital
// Life bento row above, so the whole dashboard reads as one system instead
// of switching to loud gradient tiles partway down.
function BentoGrid({ tiles }: { tiles: BentoTile[] }) {
  return (
    <View style={styles.grid}>
      {tiles.map(tile => (
        <TouchableOpacity key={tile.id} style={dash.gridTile} onPress={tile.onPress} activeOpacity={0.85}>
          <View style={dash.bentoTop}>
            <View style={[dash.tileIconChip, { backgroundColor: tile.iconColor + '22', borderColor: tile.iconColor + '55' }]}>
              <Ionicons name={tile.icon} size={19} color={tile.iconColor} />
            </View>
            {tile.badge ? (
              <View style={styles.newBadge}><Text style={styles.newBadgeText}>{tile.badge}</Text></View>
            ) : (
              <Ionicons name="arrow-forward" size={13} color={COLORS.textMuted} />
            )}
          </View>
          <Text style={dash.bentoValue} numberOfLines={1}>{tile.title}</Text>
          <Text style={dash.bentoLabel} numberOfLines={1}>{tile.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [activeUsername, setActiveUsername] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [shopStore, setShopStore] = useState<any>(null);
  const [loadingShopStore, setLoadingShopStore] = useState(true);
  const [gamesSummary, setGamesSummary] = useState<{ totalPlayed: number; byGame: { ludo: number; wordBattle: number } } | null>(null);
  const [giftStats, setGiftStats] = useState<{ totalReceived: number; receivedCount: number; totalSent: number; sentCount: number } | null>(null);
  const [recentGifts, setRecentGifts] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/wallets/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setWallet(d))
      .catch(() => {});

    fetchApi('/usernames/mine')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setActiveUsername(d.find((u: any) => u.isActive) || null))
      .catch(() => {});

    fetchApi('/work/companies/mine')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setCompany(d))
      .catch(() => {})
      .finally(() => setLoadingCompany(false));

    fetchApi('/property/mine')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setProperties(d))
      .catch(() => {})
      .finally(() => setLoadingProperties(false));

    fetchApi('/eat/my-store')
      .then(r => r.json())
      .then(data => { if (data?.id) setStore(data); })
      .catch(() => {})
      .finally(() => setLoadingStore(false));

    fetchApi('/activity/games')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setGamesSummary(d))
      .catch(() => {});

    fetchApi('/gifts/stats/mine')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setGiftStats(d))
      .catch(() => {});

    fetchApi('/gifts/received')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setRecentGifts(d.slice(0, 4)))
      .catch(() => {});

    fetchApi('/marketplace/listings/mine')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setMyListings(d))
      .catch(() => {});

    fetchApi('/shopping/my-store')
      .then(r => r.json())
      .then(data => { if (data?.id) setShopStore(data); })
      .catch(() => {})
      .finally(() => setLoadingShopStore(false));
  }, []);

  const TILES: BentoTile[] = [
    {
      id: 'eat',
      title: 'My Restaurant',
      subtitle: store ? store.name : 'Set up your store',
      icon: 'restaurant',
      iconColor: COLORS.accent,
      onPress: () => navigation.navigate('MyStore'),
      badge: store ? null : 'NEW',
    },
    {
      id: 'orders',
      title: 'Orders',
      subtitle: 'View incoming orders',
      icon: 'receipt',
      iconColor: COLORS.gold,
      onPress: () => navigation.navigate('StoreOrders'),
    },
    {
      id: 'products',
      title: 'Products',
      subtitle: store ? `${store.products?.length ?? 0} items` : 'Add products',
      icon: 'pricetags',
      iconColor: COLORS.primary,
      onPress: () => navigation.navigate('MyStore'),
    },
  ];

  const SHOP_TILES: BentoTile[] = [
    {
      id: 'shop',
      title: 'My Shop',
      subtitle: shopStore ? shopStore.name : 'Set up your store',
      icon: 'storefront',
      iconColor: COLORS.secondary,
      onPress: () => navigation.navigate('MyShoppingStore'),
      badge: shopStore ? null : 'NEW',
    },
    {
      id: 'shop-orders',
      title: 'Orders',
      subtitle: 'View incoming orders',
      icon: 'receipt',
      iconColor: COLORS.gold,
      onPress: () => navigation.navigate('ShoppingStoreOrders'),
    },
    {
      id: 'shop-products',
      title: 'Products',
      subtitle: shopStore ? `${shopStore.products?.length ?? 0} items` : 'Add products',
      icon: 'pricetags',
      iconColor: COLORS.primary,
      onPress: () => navigation.navigate('MyShoppingStore'),
    },
  ];

  const soldListings = myListings.filter(l => l.status === 'SOLD');
  const itemsSold = soldListings.length;
  const revenue = soldListings.reduce((sum, l) => sum + Number(l.price), 0);
  const salesChart = buildSalesChart(myListings);

  const feedItems = [
    ...recentGifts.map(g => ({
      key: `gift-${g.id}`,
      dotColor: COLORS.gold,
      text: `${g.sender?.profile?.displayName || g.sender?.username || 'Someone'} sent you a ${GIFT_EMOJI[g.giftType] || '🎁'} ${g.giftType}`,
      time: timeAgo(g.createdAt),
    })),
  ].slice(0, 4);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16, paddingBottom: 40 }}>
        {/* Identity strip */}
        <View>
          <Text style={dash.welcomeText}>
            Welcome, <Text style={{ color: COLORS.primary }}>{user?.displayName || user?.username}</Text>
          </Text>
          {activeUsername && (
            <View style={dash.pillRow}>
              <View style={dash.pill}>
                <Ionicons name="star" size={14} color={COLORS.gold} />
                <Text style={dash.pillText}>REPUTATION: {Math.round(activeUsername.reputationScore ?? 0)}</Text>
              </View>
              <View style={dash.pill}>
                <Ionicons name="people" size={14} color={COLORS.primary} />
                <Text style={dash.pillText}>SUBSCRIBERS: {Math.round(activeUsername.subscribersScore ?? 0)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Hero wallet card — "financial pulse" */}
        <View style={[dash.heroCard, SHADOW.glow]}>
          <LinearGradient colors={GRADIENTS.wallet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dash.heroGradient}>
            <View style={dash.heroTopRow}>
              <View>
                <Text style={dash.heroLabel}>FINANCIAL PULSE</Text>
                <Text style={dash.heroTitle}>Guranda Wallet</Text>
              </View>
              <View style={dash.heroIconWrap}>
                <Ionicons name="wallet" size={20} color="#fff" />
              </View>
            </View>

            <Text style={dash.heroBalance}>
              {wallet?.balanceMasheleni ?? '0.00'} <Text style={dash.heroCurrency}>MSH</Text>
            </Text>

            <View style={dash.heroActions}>
              <TouchableOpacity style={dash.heroBtn} onPress={() => navigation.navigate('Send')} activeOpacity={0.85}>
                <Ionicons name="send" size={14} color="#fff" />
                <Text style={dash.heroBtnText}>SEND</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dash.heroBtn} onPress={() => navigation.navigate('WalletHome')} activeOpacity={0.85}>
                <Ionicons name="stats-chart" size={14} color="#fff" />
                <Text style={dash.heroBtnText}>ACTIVITY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dash.heroBtn, dash.heroBtnGhost]}
                onPress={() => navigation.navigate('UnderConstruction', { moduleId: 'finance' })}
                activeOpacity={0.85}
              >
                <Ionicons name="trending-up" size={14} color="#fff" />
                <Text style={dash.heroBtnText}>INVEST</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Digital Life — quick glance at business + property ownership */}
        <View style={dash.bentoRow}>
          <TouchableOpacity style={dash.bentoTile} activeOpacity={0.85} onPress={() => navigation.navigate('MyCompany')}>
            <View style={dash.bentoTop}>
              <Ionicons name="briefcase" size={20} color={COLORS.accent} />
              {!loadingCompany && (
                <Ionicons name="arrow-forward" size={13} color={COLORS.textMuted} />
              )}
            </View>
            <Text style={dash.bentoLabel}>Active Jobs</Text>
            <Text style={dash.bentoValue} numberOfLines={1}>
              {loadingCompany ? '—' : company ? `${company.jobs?.length ?? 0} Posted` : 'Set up business'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={dash.bentoTile} activeOpacity={0.85} onPress={() => navigation.navigate('MyProperties')}>
            <View style={dash.bentoTop}>
              <Ionicons name="business" size={20} color={COLORS.gold} />
              {!loadingProperties && (
                <Ionicons name="arrow-forward" size={13} color={COLORS.textMuted} />
              )}
            </View>
            <Text style={dash.bentoLabel}>Property Portfolio</Text>
            <Text style={dash.bentoValue} numberOfLines={1}>
              {loadingProperties ? '—' : properties.length > 0 ? `${properties.length} Units` : 'No properties yet'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>MY ACTIVITY</Text>

        <View style={dash.statRow}>
          <View style={dash.statCard}>
            <Ionicons name="game-controller" size={18} color="#22D3EE" />
            <Text style={dash.statValue}>{gamesSummary?.totalPlayed ?? '—'}</Text>
            <Text style={dash.statLabel}>Games played</Text>
          </View>
          <View style={dash.statCard}>
            <Ionicons name="gift" size={18} color="#FBBF24" />
            <Text style={dash.statValue}>{giftStats ? `${giftStats.totalReceived}` : '—'}</Text>
            <Text style={dash.statLabel}>MSH from gifts</Text>
          </View>
          <View style={dash.statCard}>
            <Ionicons name="heart" size={18} color="#F472B6" />
            <Text style={dash.statValue}>{giftStats?.sentCount ?? '—'}</Text>
            <Text style={dash.statLabel}>Gifts sent</Text>
          </View>
        </View>

        {gamesSummary && gamesSummary.totalPlayed > 0 && (
          <View style={dash.card}>
            <View style={dash.cardHeaderRow}>
              <Ionicons name="game-controller" size={16} color="#22D3EE" />
              <Text style={dash.cardTitle}>Active Journeys</Text>
            </View>
            <View style={dash.journeyBlock}>
              <View style={dash.journeyRow}>
                <View style={[dash.journeyIconWrap, { backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.4)' }]}>
                  <Ionicons name="apps" size={18} color="#22D3EE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dash.journeyTitle}>Ludo</Text>
                  <Text style={dash.journeySub}>{gamesSummary.byGame.ludo} of {gamesSummary.totalPlayed} games played</Text>
                </View>
              </View>
              <View style={dash.journeyBar}>
                <View style={[dash.journeyBarFill, { width: `${(gamesSummary.byGame.ludo / gamesSummary.totalPlayed) * 100}%`, backgroundColor: '#22D3EE' }]} />
              </View>
            </View>
            <View style={dash.journeyBlock}>
              <View style={dash.journeyRow}>
                <View style={[dash.journeyIconWrap, { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.4)' }]}>
                  <Ionicons name="text" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dash.journeyTitle}>Word Battle</Text>
                  <Text style={dash.journeySub}>{gamesSummary.byGame.wordBattle} of {gamesSummary.totalPlayed} games played</Text>
                </View>
              </View>
              <View style={dash.journeyBar}>
                <View style={[dash.journeyBarFill, { width: `${(gamesSummary.byGame.wordBattle / gamesSummary.totalPlayed) * 100}%`, backgroundColor: COLORS.primary }]} />
              </View>
            </View>
          </View>
        )}

        <View style={dash.card}>
          <View style={dash.cardHeaderRow}>
            <Ionicons name="storefront" size={16} color="#A78BFA" />
            <Text style={dash.cardTitle}>Marketplace</Text>
          </View>
          <View style={dash.marketplaceStatsRow}>
            <View>
              <Text style={dash.bigNumber}>{itemsSold}</Text>
              <Text style={dash.bigNumberLabel}>Items sold</Text>
            </View>
            <View>
              <Text style={[dash.bigNumber, { color: '#34D399' }]}>{revenue.toFixed(0)}</Text>
              <Text style={dash.bigNumberLabel}>MSH revenue</Text>
            </View>
          </View>
          <Text style={dash.chartCaption}>Last 7 days</Text>
          <SalesBarChart buckets={salesChart} />
        </View>

        {feedItems.length > 0 && (
          <View style={dash.card}>
            <View style={dash.cardHeaderRow}>
              <Ionicons name="pulse" size={16} color={COLORS.secondary} />
              <Text style={dash.cardTitle}>Recent Feed</Text>
            </View>
            {feedItems.map((item, i) => (
              <View key={item.key} style={[dash.feedRow, i === feedItems.length - 1 && { marginBottom: 0 }]}>
                <View style={[dash.feedDot, { backgroundColor: item.dotColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={dash.feedText}>{item.text}</Text>
                  <Text style={dash.feedTime}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>MY BUSINESS</Text>
        <BentoGrid tiles={TILES} />

        {!store && !loadingStore && (
          <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('AddEditStore')}>
            <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.setupGradient}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <View style={styles.setupText}>
                <Text style={styles.setupTitle}>Open your restaurant</Text>
                <Text style={styles.setupSub}>Start selling food on Guranda Eat</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>MY SHOP</Text>
        <BentoGrid tiles={SHOP_TILES} />

        {!shopStore && !loadingShopStore && (
          <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('AddEditShoppingStore')}>
            <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.setupGradient}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <View style={styles.setupText}>
                <Text style={styles.setupTitle}>Open a brand store</Text>
                <Text style={styles.setupSub}>Start selling on Guranda Shopping</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  newBadge: { backgroundColor: COLORS.text, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeText: { color: COLORS.error, fontSize: 9, fontWeight: '800' },
  setupBanner: { borderRadius: 16, overflow: 'hidden', marginTop: -4 },
  setupGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  setupText: { flex: 1 },
  setupTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  setupSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
});

const dash = StyleSheet.create({
  // Hero wallet card
  heroCard: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  heroGradient: { padding: SPACING.lg },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  heroIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroBalance: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 18 },
  heroCurrency: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: RADIUS.sm, paddingVertical: 11,
  },
  heroBtnGhost: { backgroundColor: 'rgba(255,255,255,0.08)' },
  heroBtnText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  // Identity
  welcomeText: { ...TYPOGRAPHY.h2, fontSize: 20 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  pillText: { color: COLORS.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.glassBorder, paddingVertical: 14,
  },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.lg,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  marketplaceStatsRow: { flexDirection: 'row', gap: 28, marginBottom: 12 },
  bigNumber: { color: '#A78BFA', fontSize: 24, fontWeight: '800' },
  bigNumberLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  chartCaption: { color: COLORS.textMuted, fontSize: 10.5, marginBottom: 6 },
  chartLabel: { color: COLORS.textMuted, fontSize: 9, width: 20, textAlign: 'center' },

  // Digital Life bento row
  bentoRow: { flexDirection: 'row', gap: 12 },
  bentoTile: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.md,
  },
  bentoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bentoLabel: { color: COLORS.textMuted, fontSize: 11.5, marginBottom: 2 },
  bentoValue: { color: COLORS.text, fontSize: 15, fontWeight: '700' },

  // MY BUSINESS / MY SHOP grid tiles — same flat-card language as the bento
  // row above, just width-based instead of flex-based so 3 tiles can wrap
  // 2-per-row instead of always splitting evenly in pairs.
  gridTile: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.md,
  },
  tileIconChip: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },

  // Active journeys
  journeyBlock: { marginBottom: 14 },
  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  journeyIconWrap: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  journeyTitle: { color: COLORS.text, fontSize: 13.5, fontWeight: '700' },
  journeySub: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 1 },
  journeyBar: { height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceElevated, overflow: 'hidden' },
  journeyBarFill: { height: '100%', borderRadius: 2 },

  // Recent feed
  feedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  feedDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 5 },
  feedText: { color: COLORS.text, fontSize: 12.5, lineHeight: 17 },
  feedTime: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, letterSpacing: 0.3 },
});
