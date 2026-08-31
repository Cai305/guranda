import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ThemeTokens } from '../../theme/themes';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { MINI_APP_MANAGE_REGISTRY, MiniAppManageSummary } from '../../config/miniAppManage';
import { AccountType, ACCOUNT_TYPE_LABEL, deriveAccountType } from '../../config/accountType';
import BusinessInsightsCard from '../../components/profile/BusinessInsightsCard';

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

// Buckets an installed app's own items into the last CHART_DAYS days by
// createdAt, keyed by day-of-week label, for the small per-app analytics
// chart on its manage tile.
function buildDayBuckets(dates: string[]) {
  const now = Date.now();
  const buckets = Array.from({ length: CHART_DAYS }, (_, i) => {
    const dayStart = now - (CHART_DAYS - 1 - i) * DAY_MS;
    const d = new Date(dayStart);
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), count: 0 };
  });
  const oldestBucketStart = now - CHART_DAYS * DAY_MS;

  for (const iso of dates) {
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < oldestBucketStart) continue;
    const dayIndex = Math.min(CHART_DAYS - 1, Math.floor((ms - oldestBucketStart) / DAY_MS));
    if (buckets[dayIndex]) buckets[dayIndex].count += 1;
  }
  return buckets;
}

function MiniBarChart({ buckets }: { buckets: { label: string; count: number }[] }) {
  const dash = useThemedStyles(createDashStyles);
  const width = 220;
  const height = 56;
  const barW = width / buckets.length - 8;
  const max = Math.max(1, ...buckets.map(b => b.count));

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {buckets.map((b, i) => {
          const barH = (b.count / max) * (height - 16);
          const x = i * (width / buckets.length) + 4;
          return (
            <Rect
              key={i}
              x={x}
              y={height - 12 - barH}
              width={barW}
              height={Math.max(2, barH)}
              rx={3}
              fill={b.count > 0 ? '#A78BFA' : 'rgba(255,255,255,0.1)'}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', width, justifyContent: 'space-between', marginTop: 3 }}>
        {buckets.map((b, i) => (
          <Text key={i} style={dash.chartLabel}>{b.label}</Text>
        ))}
      </View>
    </View>
  );
}

// One tile per installed, CRUD-capable mini app — icon, item count, and (when
// the app has dated items) a tiny analytics chart. Locked by an admin's
// `crud:<id>` feature flag renders it dimmed and non-navigable instead of
// hidden entirely, so the user can see it's there but disabled.
function ManageAppCard({
  entry,
  summary,
  loading,
  locked,
  onPress,
}: {
  entry: (typeof MINI_APP_MANAGE_REGISTRY)[number];
  summary: MiniAppManageSummary | undefined;
  loading: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const dash = useThemedStyles(createDashStyles);
  const hasRevenue = !loading && !!summary && summary.revenue !== undefined;
  // Prefer the earnings chart when there's dated revenue data — money made
  // is more useful to see trending than raw item count — falling back to
  // the item-count chart otherwise. Only one chart per card to stay compact.
  const revenueChartDates = summary?.revenueDates;
  const chartDates = revenueChartDates && revenueChartDates.length > 0 ? revenueChartDates : summary?.dates;
  const hasChart = !loading && !!summary && !!chartDates && chartDates.length > 0;
  return (
    <TouchableOpacity
      style={[dash.gridTile, locked && dash.manageCardLocked]}
      activeOpacity={locked ? 1 : 0.85}
      onPress={locked ? undefined : onPress}
      disabled={locked}
    >
      <View style={dash.bentoTop}>
        <View style={[dash.tileIconChip, { backgroundColor: entry.iconColor + '22', borderColor: entry.iconColor + '55' }]}>
          <Ionicons name={entry.icon as any} size={19} color={locked ? COLORS.textMuted : entry.iconColor} />
        </View>
        {locked ? (
          <Ionicons name="lock-closed" size={13} color={COLORS.textMuted} />
        ) : (
          <Ionicons name="arrow-forward" size={13} color={COLORS.textMuted} />
        )}
      </View>
      <Text style={dash.bentoValue} numberOfLines={1}>{entry.label}</Text>
      <Text style={dash.bentoLabel} numberOfLines={1}>
        {locked ? 'Locked by admin' : loading ? '—' : summary ? `${summary.count} ${summary.countLabel}` : '—'}
      </Text>
      {hasRevenue && !locked && (
        <Text style={dash.earningsLabel} numberOfLines={1}>{formatCurrency(summary!.revenue!)} earned</Text>
      )}
      {hasChart && !locked && (
        <View style={{ marginTop: 10 }}>
          <MiniBarChart buckets={buildDayBuckets(chartDates!)} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function AnalyticsCard({
  icon,
  iconColor,
  title,
  stats,
}: {
  icon: string;
  iconColor: string;
  title: string;
  stats: { value: string | number; label: string }[];
}) {
  const dash = useThemedStyles(createDashStyles);
  return (
    <View style={dash.card}>
      <View style={dash.cardHeaderRow}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
        <Text style={dash.cardTitle}>{title}</Text>
      </View>
      <View style={dash.analyticsStatsRow}>
        {stats.map(s => (
          <View key={s.label}>
            <Text style={dash.bigNumber}>{s.value}</Text>
            <Text style={dash.bigNumberLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SHADOW, SPACING } = theme;
  const styles = useThemedStyles(createStyles);
  const dash = useThemedStyles(createDashStyles);
  const { user, isVerified } = useAuth();
  const { isInstalled } = useStore();
  const { effectiveAccess } = useFeatureFlags();
  const [wallet, setWallet] = useState<any>(null);
  const [activeUsername, setActiveUsername] = useState<any>(null);
  const [gamesSummary, setGamesSummary] = useState<{ totalPlayed: number; byGame: { ludo: number; wordBattle: number } } | null>(null);
  const [giftStats, setGiftStats] = useState<{ totalReceived: number; receivedCount: number; totalSent: number; sentCount: number } | null>(null);
  const [recentGifts, setRecentGifts] = useState<any[]>([]);
  const [manageSummaries, setManageSummaries] = useState<Record<string, MiniAppManageSummary>>({});
  const [loadingManage, setLoadingManage] = useState(true);
  const [socialStats, setSocialStats] = useState<{ postCount: number; likesReceived: number; commentsReceived: number } | null>(null);
  const [videoStats, setVideoStats] = useState<{ videoCount: number; totalViews: number; totalLikes: number; totalComments: number; giftsReceived: number; giftCount: number } | null>(null);
  const [storyStats, setStoryStats] = useState<{ storyCount: number; likesReceived: number; commentsReceived: number; ranksReceived: number; giftsReceived: number; giftCount: number } | null>(null);
  const [creatorFunds, setCreatorFunds] = useState<{ accumulatedThisMonth: number; nextPayoutDate: string } | null>(null);
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const [accountTypeOverride, setAccountTypeOverride] = useState<AccountType | null>(null);

  useEffect(() => {
    fetchApi('/wallets/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setWallet(d))
      .catch(() => {});

    fetchApi('/usernames/mine')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setActiveUsername(d.find((u: any) => u.isActive) || null))
      .catch(() => {});

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

    fetchApi('/posts/mine/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setSocialStats(d))
      .catch(() => {});

    fetchApi('/videos/mine/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setVideoStats(d))
      .catch(() => {});

    fetchApi('/communities/my')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setMyCommunities(d.filter((c: any) => c.myRole === 'ADMIN')))
      .catch(() => {});

    fetchApi('/stories/mine/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setStoryStats(d))
      .catch(() => {});

    fetchApi('/wallets/creator-funds/summary')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setCreatorFunds(d))
      .catch(() => {});

    fetchApi('/business-insights/account-type')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setAccountTypeOverride(d.override))
      .catch(() => {});
  }, []);

  const installedManageApps = MINI_APP_MANAGE_REGISTRY.filter(e => isInstalled(e.id));
  const installedIdsKey = installedManageApps.map(e => e.id).join(',');
  const accountType = accountTypeOverride ?? deriveAccountType(installedManageApps.length);

  const pickAccountType = () => {
    const options: (AccountType | null)[] = ['PERSONAL', 'CREATOR', 'MERCHANT', 'BUSINESS', null];
    Alert.alert(
      'Account type',
      'Choose how your Dashboard is framed, or use the automatic one based on how many mini apps you run.',
      [
        ...options.map(opt => ({
          text: opt === null ? `Automatic (${ACCOUNT_TYPE_LABEL[deriveAccountType(installedManageApps.length)]})` : ACCOUNT_TYPE_LABEL[opt],
          onPress: () => {
            setAccountTypeOverride(opt);
            fetchApi('/business-insights/account-type', {
              method: 'PATCH',
              body: JSON.stringify(opt ? { accountType: opt } : {}),
            }).catch(() => {});
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingManage(true);
    Promise.all(
      installedManageApps.map(async e => [e.id, await e.fetchSummary()] as const)
    ).then(pairs => {
      if (cancelled) return;
      setManageSummaries(Object.fromEntries(pairs));
      setLoadingManage(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installedIdsKey]);

  const insightsApps = installedManageApps
    .filter(e => manageSummaries[e.id]?.revenue !== undefined)
    .map(e => ({ id: e.id, label: e.label, revenue: manageSummaries[e.id].revenue as number }));

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
        <TouchableOpacity onPress={pickAccountType} style={dash.accountTypeBadge}>
          <Text style={dash.accountTypeBadgeText}>{ACCOUNT_TYPE_LABEL[accountType]}</Text>
        </TouchableOpacity>
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
              {formatCurrency(wallet?.balanceMasheleni ?? 0)}
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

        {/* Manage My Apps — one tile per installed mini app with owner CRUD,
            item count and a small analytics chart. Reflects install state,
            not a fixed hardcoded list. */}
        <Text style={styles.sectionLabel}>MANAGE MY APPS</Text>
        {installedManageApps.length > 0 ? (
          <View style={styles.grid}>
            {installedManageApps.map(entry => {
              const locked = effectiveAccess(`crud:${entry.id}`, isVerified) !== 'open';
              return (
                <ManageAppCard
                  key={entry.id}
                  entry={entry}
                  summary={manageSummaries[entry.id]}
                  loading={loadingManage}
                  locked={locked}
                  onPress={() => {
                    const summary = manageSummaries[entry.id];
                    const route = entry.resolveRoute(summary ?? { count: 0, countLabel: '', dates: [], raw: null });
                    navigation.navigate(route.name, route.params);
                  }}
                />
              );
            })}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.setupBanner}
            onPress={() => navigation.navigate('Main', { screen: 'Life', params: { screen: 'Hub' } })}
          >
            <LinearGradient colors={GRADIENTS.emerald} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.setupGradient}>
              <Ionicons name="apps" size={24} color="#fff" />
              <View style={styles.setupText}>
                <Text style={styles.setupTitle}>Install a mini app</Text>
                <Text style={styles.setupSub}>Manage your own inventory here once you do</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Business Insights — AI-narrated read of the real numbers already
            fetched above (installed mini-app revenue + social/video/story
            stats), with a real week-over-week delta computed server-side.
            Only renders once mini-app summaries have actually loaded, so it
            never narrates a placeholder zero. */}
        {!loadingManage && (
          <>
            <Text style={styles.sectionLabel}>BUSINESS INSIGHTS</Text>
            <BusinessInsightsCard
              input={{
                apps: insightsApps,
                social: socialStats ?? undefined,
                video: videoStats ?? undefined,
                story: storyStats ?? undefined,
                gifts: giftStats ? { totalReceived: giftStats.totalReceived, totalSent: giftStats.totalSent } : undefined,
              }}
            />
          </>
        )}

        {/* My Analytics — platform-wide engagement, separate from mini-app
            inventory above: your posts/likes, communities you run, and your
            Discovery video reach. */}
        <Text style={styles.sectionLabel}>MY ANALYTICS</Text>
        <AnalyticsCard
          icon="chatbubbles"
          iconColor={COLORS.secondary}
          title="Social Feed"
          stats={[
            { value: socialStats?.postCount ?? '—', label: 'Posts' },
            { value: socialStats?.likesReceived ?? '—', label: 'Likes received' },
            { value: socialStats?.commentsReceived ?? '—', label: 'Comments' },
          ]}
        />
        <AnalyticsCard
          icon="people-circle"
          iconColor="#34D399"
          title="Community"
          stats={[
            { value: myCommunities.length, label: myCommunities.length === 1 ? 'Community run' : 'Communities run' },
            { value: myCommunities.reduce((sum, c) => sum + (c._count?.members ?? 0), 0), label: 'Total members' },
          ]}
        />
        <AnalyticsCard
          icon="play-circle"
          iconColor={COLORS.accent}
          title="Discovery"
          stats={[
            { value: videoStats?.videoCount ?? '—', label: 'Videos' },
            { value: videoStats?.totalViews ?? '—', label: 'Total views' },
            { value: videoStats?.totalLikes ?? '—', label: 'Total likes' },
            { value: videoStats?.totalComments ?? '—', label: 'Comments' },
            { value: videoStats ? formatCurrency(videoStats.giftsReceived) : '—', label: 'Gifts' },
          ]}
        />
        <AnalyticsCard
          icon="ribbon"
          iconColor={COLORS.gold}
          title="Stories & Content Earnings"
          stats={[
            { value: storyStats?.storyCount ?? '—', label: 'Stories' },
            { value: storyStats?.likesReceived ?? '—', label: 'Likes' },
            { value: storyStats?.commentsReceived ?? '—', label: 'Comments' },
            { value: storyStats?.ranksReceived ?? '—', label: 'Ranks' },
            { value: storyStats ? formatCurrency(storyStats.giftsReceived) : '—', label: 'Gifts' },
          ]}
        />
        <View style={dash.ccrCard}>
          <View style={dash.cardHeaderRow}>
            <Ionicons name="wallet" size={16} color={COLORS.gold} />
            <Text style={dash.cardTitle}>Content Contribution Remuneration</Text>
          </View>
          <Text style={dash.ccrCaption}>
            Earned from likes, comments and ranks on your "of the Day" stories — paid out in one lump sum on the 14th of every month.
          </Text>
          <View style={dash.ccrRow}>
            <View>
              <Text style={dash.bigNumber}>{creatorFunds ? formatCurrency(creatorFunds.accumulatedThisMonth) : '—'}</Text>
              <Text style={dash.bigNumberLabel}>Accumulated this month</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[dash.bigNumberLabel, { marginBottom: 2 }]}>Next payout</Text>
              <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 13 }}>
                {creatorFunds ? new Date(creatorFunds.nextPayoutDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </Text>
            </View>
          </View>
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
            <Text style={dash.statValue}>{giftStats ? formatCurrency(giftStats.totalReceived) : '—'}</Text>
            <Text style={dash.statLabel}>from gifts</Text>
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

      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles({ COLORS, SPACING, TYPOGRAPHY }: ThemeTokens) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  setupBanner: { borderRadius: 16, overflow: 'hidden', marginTop: -4 },
  setupGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  setupText: { flex: 1 },
  setupTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  setupSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  });
}

function createDashStyles({ COLORS, SPACING, RADIUS, TYPOGRAPHY }: ThemeTokens) {
  return StyleSheet.create({
  accountTypeBadge: {
    borderWidth: 1, borderColor: COLORS.glassBorder, backgroundColor: COLORS.glass,
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  accountTypeBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
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
  chartLabel: { color: COLORS.textMuted, fontSize: 9, width: 20, textAlign: 'center' },
  ccrCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.lg,
  },
  ccrCaption: { color: COLORS.textMuted, fontSize: 11.5, lineHeight: 16, marginBottom: 14 },
  ccrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },

  bentoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bentoLabel: { color: COLORS.textMuted, fontSize: 11.5, marginBottom: 2 },
  bentoValue: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  earningsLabel: { color: '#34D399', fontSize: 11.5, fontWeight: '700', marginTop: 4 },

  // Manage My Apps grid tiles — flat-card language, width-based so tiles
  // wrap 2-per-row instead of always splitting evenly in pairs.
  gridTile: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.md,
  },
  manageCardLocked: { opacity: 0.45 },
  tileIconChip: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },

  // My Analytics cards (Social/Community/Discovery) — reuses the same flat
  // `card` shell as Active Journeys, just with a row of stat pairs inside.
  analyticsStatsRow: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  bigNumber: { color: '#A78BFA', fontSize: 22, fontWeight: '800' },
  bigNumberLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

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
}
