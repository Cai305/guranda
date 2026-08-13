import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CampaignDto } from '@mxit2/types';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import ContextualNewsBanner from '../components/ContextualNewsBanner';

// Same tone-per-type mapping as OpportunityCard.tsx — duplicated locally
// (matches this codebase's convention of small per-file lookup tables, e.g.
// ChallengeCard's own CATEGORY_GRADIENT) rather than a shared import.
const CAMPAIGN_LOOK: Record<string, { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  BUSINESS: { gradient: ['#CA8A04', '#713F12'], icon: 'briefcase', label: 'Sponsored' },
  MINI_APP_LAUNCH: { gradient: ['#7C3AED', '#4C1D95'], icon: 'rocket', label: 'New Mini App' },
  PLATFORM_UPDATE: { gradient: ['#334155', '#0F172A'], icon: 'megaphone', label: 'Platform Update' },
  CREATOR_PROMO: { gradient: ['#DB2777', '#831843'], icon: 'star', label: 'Creator Promo' },
  REVIEWER_RECOMMENDATION: { gradient: ['#0891B2', '#164E63'], icon: 'ribbon', label: 'Recommended' },
};

export default function CampaignDetailScreen({ navigation, route }: any) {
  const { campaignId } = route.params;
  const [campaign, setCampaign] = useState<(CampaignDto & { createdByBusiness?: { name: string } | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { COLORS } = theme;

  useEffect(() => {
    fetchApi(`/campaigns/${campaignId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setCampaign)
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
    hero: {
      marginHorizontal: SPACING.lg, borderRadius: RADIUS.xl,
      paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg,
      alignItems: 'center', marginBottom: SPACING.md,
    },
    heroIcon: {
      width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
    },
    badge: {
      backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: RADIUS.pill,
      paddingHorizontal: 10, paddingVertical: 4, marginBottom: SPACING.sm,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    heroTitle: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
    heroSponsor: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
    card: {
      marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.surface,
      borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg,
    },
    cardLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: SPACING.sm },
    description: { ...TYPOGRAPHY.body1, lineHeight: 22, color: '#D6D6E2' },
    metaRow: { flexDirection: 'row', gap: 20, marginTop: SPACING.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
    actionBtn: {
      marginHorizontal: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
      paddingVertical: 15, alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg,
    },
    actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  }));

  const openAction = () => {
    if (!campaign) return;
    fetchApi(`/campaigns/${campaign.id}/click`, { method: 'POST' }).catch(() => {});
    navigation.navigate(campaign.actionRoute.name, campaign.actionRoute.params);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.empty}><ActivityIndicator color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }
  if (!campaign) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}><Text style={{ color: COLORS.textMuted }}>Campaign not found.</Text></View>
      </SafeAreaView>
    );
  }

  const look = CAMPAIGN_LOOK[campaign.type] ?? CAMPAIGN_LOOK.BUSINESS;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 36 }} />
        </View>

        <LinearGradient colors={look.gradient} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name={look.icon} size={30} color="#FFF" />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{look.label}</Text>
          </View>
          <Text style={styles.heroTitle}>{campaign.title}</Text>
          {!!campaign.createdByBusiness?.name && (
            <Text style={styles.heroSponsor}>by {campaign.createdByBusiness.name}</Text>
          )}
        </LinearGradient>

        <ContextualNewsBanner contextType="CAMPAIGN" contextKey={campaign.id} />

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ABOUT</Text>
          <Text style={styles.description}>{campaign.description}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="gift-outline" size={16} color={COLORS.gold} />
              <Text style={[styles.metaText, { color: COLORS.gold }]}>{campaign.rewardLabel}</Text>
            </View>
            {!!campaign.estimatedMinutes && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.metaText}>{campaign.estimatedMinutes} min</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={openAction}>
          <Text style={styles.actionBtnText}>{campaign.actionLabel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
