import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCount } from '../utils/format';

interface GrowthMetric {
  current: number;
  deltaWeek: number | null;
  history: { value: number; when: string }[];
}

interface Growth {
  reputation: GrowthMetric;
  subscribers: GrowthMetric;
  videoViews: GrowthMetric;
  engagementRate: { current: number; postCount: number; likesReceived: number; commentsReceived: number };
}

function deltaText(deltaWeek: number | null): { text: string; positive: boolean } {
  if (deltaWeek === null) return { text: 'Not enough history yet', positive: false };
  if (deltaWeek > 0) return { text: `Up ${formatCount(deltaWeek)} this week`, positive: true };
  if (deltaWeek < 0) return { text: `Down ${formatCount(Math.abs(deltaWeek))} this week`, positive: false };
  return { text: 'Steady this week', positive: false };
}

// Small in-house sparkline — matches DashboardScreen's MiniBarChart pattern
// (plain react-native-svg, no charting library) rather than introducing a
// new dependency for one screen.
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const width = 280;
  const height = 48;
  if (points.length < 2) {
    return (
      <View style={{ width, height, justifyContent: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Not enough history yet</Text>
      </View>
    );
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (width - 8) + 4;
    const y = height - 6 - ((v - min) / range) * (height - 12);
    return `${x},${y}`;
  });
  const lastCoord = coords[coords.length - 1].split(',').map(Number);
  return (
    <Svg width={width} height={height}>
      <Polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth={2} />
      <Circle cx={lastCoord[0]} cy={lastCoord[1]} r={3.5} fill={color} />
    </Svg>
  );
}

export default function MyGrowthScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [data, setData] = useState<Growth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/profile/me/growth', { headers: { 'Cache-Control': 'no-cache' } });
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

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
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
    scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
    card: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
      marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    bigNumber: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
    deltaText: { fontSize: 12, marginTop: 2 },
    engagementRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
    engagementStat: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, paddingVertical: SPACING.sm },
    engagementValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    engagementLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
    footnote: { color: COLORS.textMuted, fontSize: 11.5, lineHeight: 16, marginTop: SPACING.sm },
  }));

  if (loading) {
    return <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.text} /></SafeAreaView>;
  }

  const metrics: { key: keyof Pick<Growth, 'reputation' | 'subscribers' | 'videoViews'>; icon: string; color: string; label: string }[] = [
    { key: 'reputation', icon: 'shield-checkmark', color: '#8B5CF6', label: 'Reputation' },
    { key: 'subscribers', icon: 'people', color: '#22D3EE', label: 'Subscribers' },
    { key: 'videoViews', icon: 'play-circle', color: '#FBBF24', label: 'Video reach' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Growth</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} />}
      >
        {data && metrics.map(m => {
          const metric = data[m.key];
          const delta = deltaText(metric.deltaWeek);
          return (
            <View key={m.key} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name={m.icon as any} size={16} color={m.color} />
                  <Text style={styles.cardTitle}>{m.label}</Text>
                </View>
              </View>
              <Text style={styles.bigNumber}>{formatCount(metric.current)}</Text>
              <Text style={[styles.deltaText, { color: metric.deltaWeek && metric.deltaWeek > 0 ? COLORS.success : COLORS.textMuted }]}>
                {delta.text}
              </Text>
              <View style={{ marginTop: 12 }}>
                <Sparkline points={metric.history.map(h => h.value)} color={m.color} />
              </View>
            </View>
          );
        })}

        {data && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="flame" size={16} color="#F472B6" />
                <Text style={styles.cardTitle}>Engagement</Text>
              </View>
            </View>
            <Text style={styles.bigNumber}>{data.engagementRate.current}</Text>
            <Text style={styles.deltaText}>Likes + comments per post, right now</Text>
            <View style={styles.engagementRow}>
              <View style={styles.engagementStat}>
                <Text style={styles.engagementValue}>{data.engagementRate.postCount}</Text>
                <Text style={styles.engagementLabel}>Posts</Text>
              </View>
              <View style={styles.engagementStat}>
                <Text style={styles.engagementValue}>{data.engagementRate.likesReceived}</Text>
                <Text style={styles.engagementLabel}>Likes</Text>
              </View>
              <View style={styles.engagementStat}>
                <Text style={styles.engagementValue}>{data.engagementRate.commentsReceived}</Text>
                <Text style={styles.engagementLabel}>Comments</Text>
              </View>
            </View>
            <Text style={styles.footnote}>
              Engagement doesn't have a week-over-week trend yet — only your current totals are tracked. Reputation, subscribers and video reach above are real day-over-day history.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
