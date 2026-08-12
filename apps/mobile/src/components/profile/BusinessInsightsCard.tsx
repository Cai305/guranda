import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../context/ThemeContext';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

interface AppInsight {
  id: string;
  label: string;
  revenue: number;
  deltaPct: number | null;
  text: string;
}

interface NarrationResult {
  overall: { text: string; totalRevenue: number; deltaPct: number | null };
  apps: AppInsight[];
  engagement: { text: string; deltaPct: number | null } | null;
  generatedByAi: boolean;
}

export interface BusinessInsightsInput {
  apps: { id: string; label: string; revenue: number }[];
  social?: { postCount: number; likesReceived: number; commentsReceived: number };
  video?: { videoCount: number; totalViews: number; totalLikes: number; totalComments: number; giftsReceived: number };
  story?: { storyCount: number; likesReceived: number; commentsReceived: number; ranksReceived: number; giftsReceived: number };
  gifts?: { totalReceived: number; totalSent: number };
}

// Real week-over-week deltas computed server-side from actual snapshots,
// optionally phrased by the LLM — see BusinessInsightsService.narrate(). No
// number here is ever invented; deltaPct/revenue always come straight from
// what this card itself passed in or from a stored snapshot of the same.
export default function BusinessInsightsCard({ input }: { input: BusinessInsightsInput }) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [result, setResult] = useState<NarrationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchApi('/business-insights/narrate', {
      method: 'POST',
      body: JSON.stringify(input),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => !cancelled && d && setResult(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    card: {
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      gap: 10,
    },
    headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    headerText: { ...TYPOGRAPHY.caption, fontSize: 10, letterSpacing: 1 },
    line: { ...TYPOGRAPHY.body2, fontSize: 13, lineHeight: 19 },
    appLine: { ...TYPOGRAPHY.caption, fontSize: 12, lineHeight: 17 },
  }));

  if (loading && !result) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  if (!result) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="sparkles" size={13} color={COLORS.primary} />
        <Text style={[styles.headerText, { color: COLORS.primary }]}>
          {result.generatedByAi ? 'AI INSIGHT' : 'INSIGHT'} · {formatCurrency(result.overall.totalRevenue)} TOTAL
        </Text>
      </View>
      <Text style={styles.line}>{result.overall.text}</Text>
      {result.apps.map(a => (
        <Text key={a.id} style={styles.appLine}>• {a.text}</Text>
      ))}
      {result.engagement && <Text style={styles.appLine}>• {result.engagement.text}</Text>}
    </View>
  );
}
