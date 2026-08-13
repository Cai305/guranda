import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import ContextualNewsBanner from '../components/ContextualNewsBanner';

interface Analytics {
  impressions: number;
  clicks: number;
  completions: number;
  spent: number;
  deltaImpressionsPct: number | null;
  deltaClicksPct: number | null;
  deltaCompletionsPct: number | null;
}

function DeltaText({ pct }: { pct: number | null }) {
  const { theme } = useTheme();
  if (pct === null) return null;
  const color = pct >= 0 ? theme.COLORS.success : theme.COLORS.error;
  return <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{pct >= 0 ? '+' : ''}{pct}% this week</Text>;
}

export default function CampaignAnalyticsScreen({ navigation, route }: any) {
  const { campaignId } = route.params;
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;

  useEffect(() => {
    fetchApi(`/campaigns/${campaignId}/analytics`)
      .then(r => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, paddingHorizontal: SPACING.lg },
    card: {
      width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 4,
    },
    cardLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    cardValue: { ...TYPOGRAPHY.h3, fontSize: 22 },
    sectionLabel: { ...TYPOGRAPHY.label, paddingHorizontal: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.sm },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Campaign Analytics</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={COLORS.primary} /></View>
      ) : !data ? (
        <View style={styles.empty}><Text style={{ color: COLORS.textMuted }}>Could not load analytics.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Impressions</Text>
              <Text style={styles.cardValue}>{data.impressions}</Text>
              <DeltaText pct={data.deltaImpressionsPct} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Clicks</Text>
              <Text style={styles.cardValue}>{data.clicks}</Text>
              <DeltaText pct={data.deltaClicksPct} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Completions</Text>
              <Text style={styles.cardValue}>{data.completions}</Text>
              <DeltaText pct={data.deltaCompletionsPct} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Spent</Text>
              <Text style={styles.cardValue}>{formatCurrency(data.spent)}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>BRAND UPDATES</Text>
          <ContextualNewsBanner contextType="CAMPAIGN" contextKey={campaignId} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
