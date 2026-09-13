import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { FeatureWithStatsDto, FeatureInstallationDto } from '@mxit2/types';

// Feature detail + real Purchase/Install/Review flow (Phase 4 Marketplace).
// Purchase and install are two real, separate endpoints (POST .../purchase,
// POST .../install) — for a PAID/SUBSCRIPTION Feature the buy button chains
// them client-side (purchase, then install) after one confirm, same
// confirm-then-call UX EventMiniCard's handleBook uses for booking a real
// paid event. Nothing here is optimistic — every state transition re-reads
// from the real API response.
export default function FeatureDetailScreen({ route, navigation }: any) {
  const { featureId } = route.params;
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { user } = useAuth();

  const [feature, setFeature] = useState<FeatureWithStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [installation, setInstallation] = useState<FeatureInstallationDto | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 60, gap: 16 },
    topCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 16, gap: 12,
    },
    topRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    iconWrap: {
      width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.background,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    name: { color: COLORS.text, fontWeight: '800', fontSize: 18 },
    category: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    creator: { color: COLORS.textMuted, fontSize: 12 },
    description: { color: COLORS.text, fontSize: 13.5, lineHeight: 19 },
    statsRow: { flexDirection: 'row', gap: 16 },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
    statLabel: { color: COLORS.textMuted, fontSize: 10.5, marginTop: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    priceText: { color: COLORS.primary, fontWeight: '800', fontSize: 18 },
    freeText: { color: '#22C55E', fontWeight: '800', fontSize: 16 },
    primaryBtn: {
      backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 14, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14.5 },
    secondaryBtn: {
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.sm, padding: 14, alignItems: 'center',
    },
    secondaryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    installedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
      borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5,
    },
    installedText: { color: '#22C55E', fontWeight: '700', fontSize: 12 },
    sectionLabel: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    reviewCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 14, gap: 10,
    },
    starsRow: { flexDirection: 'row', gap: 6 },
    reviewInput: {
      backgroundColor: COLORS.background, color: COLORS.text, padding: 10,
      borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
      minHeight: 60, textAlignVertical: 'top', fontSize: 13.5,
    },
    reviewItem: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 12, gap: 6,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reviewAuthor: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    reviewComment: { color: COLORS.textMuted, fontSize: 12.5, lineHeight: 17 },
    errorBox: {
      backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
      borderRadius: RADIUS.sm, padding: 12,
    },
    errorText: { color: '#F87171', fontSize: 13 },
    emptyBody: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', paddingVertical: 10 },
  }));

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detailRes, installedRes] = await Promise.all([
        fetchApi(`/features/${featureId}`),
        fetchApi('/features/mine/installed'),
      ]);
      const detail = await detailRes.json();
      if (!detailRes.ok) throw new Error(detail?.message || 'Could not load this Feature.');
      setFeature(detail as FeatureWithStatsDto);

      if (installedRes.ok) {
        const installed = (await installedRes.json()) as FeatureInstallationDto[];
        setInstallation(installed.find((i) => i.featureId === featureId) ?? null);
      }
    } catch (e: any) {
      setError(e.message || 'Could not load this Feature.');
    }
  }, [featureId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const isOwner = feature && user?.userId === feature.createdByUserId;
  const isFree = feature?.pricingType === 'FREE';
  const isInstalled = !!installation;

  const doInstall = async () => {
    setBusy(true);
    try {
      const res = await fetchApi(`/features/${featureId}/install`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not install this Feature.');
      await load();
      Alert.alert('Installed', `"${feature?.name}" is now installed.`);
    } catch (e: any) {
      Alert.alert('Install failed', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const doPurchaseThenInstall = async () => {
    setBusy(true);
    try {
      const purchaseRes = await fetchApi(`/features/${featureId}/purchase`, { method: 'POST' });
      const purchaseData = await purchaseRes.json();
      if (!purchaseRes.ok) {
        // Already-owned is a real, non-fatal outcome — fall through to install.
        if (!/already have access|already own/i.test(purchaseData?.message || '')) {
          throw new Error(purchaseData?.message || 'Purchase failed.');
        }
      }
      const installRes = await fetchApi(`/features/${featureId}/install`, { method: 'POST' });
      const installData = await installRes.json();
      if (!installRes.ok) throw new Error(installData?.message || 'Could not install this Feature.');
      await load();
      Alert.alert('Purchased & Installed', `"${feature?.name}" is now yours.`);
    } catch (e: any) {
      Alert.alert('Purchase failed', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyOrInstall = () => {
    if (!feature) return;
    if (isFree) {
      Alert.alert('Install Feature', `Install "${feature.name}" for free?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Install', onPress: doInstall },
      ]);
      return;
    }
    const priceLabel = feature.pricingType === 'SUBSCRIPTION'
      ? `${formatCurrency(feature.price)}/month`
      : formatCurrency(feature.price);
    Alert.alert(
      'Confirm purchase',
      `Buy "${feature.name}" for ${priceLabel}? This will be debited from your Rand wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy', onPress: doPurchaseThenInstall },
      ],
    );
  };

  const handleUninstall = () => {
    if (!feature) return;
    Alert.alert('Uninstall Feature', `Uninstall "${feature.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Uninstall',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await fetchApi(`/features/${featureId}/uninstall`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Could not uninstall.');
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not uninstall.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const submitReview = async () => {
    if (reviewRating < 1) {
      Alert.alert('Pick a rating', 'Tap a star to rate this Feature before submitting.');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetchApi(`/features/${featureId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not submit your review.');
      setReviewComment('');
      setReviewRating(0);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit your review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !feature) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Feature</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error || 'Feature not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2} numberOfLines={1}>{feature.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={(feature.icon as any) || 'sparkles-outline'} size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.name}>{feature.name}</Text>
              <Text style={styles.category}>{feature.category}</Text>
              {feature.createdByUser && (
                <Text style={styles.creator}>by @{feature.createdByUser.username}</Text>
              )}
            </View>
          </View>

          <Text style={styles.description}>{feature.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{feature.stats.averageRating > 0 ? feature.stats.averageRating.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>{feature.stats.reviewCount} review{feature.stats.reviewCount === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{feature.stats.installCount}</Text>
              <Text style={styles.statLabel}>installs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{feature.stats.purchaseCount}</Text>
              <Text style={styles.statLabel}>purchases</Text>
            </View>
          </View>

          {isInstalled && (
            <View style={styles.installedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <Text style={styles.installedText}>Installed</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            {isFree ? <Text style={styles.freeText}>FREE</Text> : (
              <Text style={styles.priceText}>
                {formatCurrency(feature.price)}{feature.pricingType === 'SUBSCRIPTION' ? '/mo' : ''}
              </Text>
            )}
          </View>

          {isOwner ? (
            <Text style={styles.emptyBody}>You created this Feature.</Text>
          ) : isInstalled ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleUninstall} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.secondaryBtnText}>Uninstall</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleBuyOrInstall} disabled={busy}>
              {busy ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name={isFree ? 'download-outline' : 'card-outline'} size={17} color="#FFF" />
                  <Text style={styles.primaryBtnText}>{isFree ? 'Install' : `Buy for ${formatCurrency(feature.price)}`}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {isInstalled && (
          <View style={styles.reviewCard}>
            <Text style={styles.sectionLabel}>Rate this Feature</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                  <Ionicons
                    name={n <= reviewRating ? 'star' : 'star-outline'}
                    size={26}
                    color={n <= reviewRating ? '#F59E0B' : COLORS.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Optional comment…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={submitReview} disabled={submittingReview}>
              {submittingReview ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Submit Review</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Text style={styles.sectionLabel}>Reviews ({feature.stats.reviewCount})</Text>
          {feature.reviews.length === 0 ? (
            <Text style={styles.emptyBody}>No reviews yet.</Text>
          ) : (
            feature.reviews.map((r) => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>@{r.user?.username ?? 'user'}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={12} color="#F59E0B" />
                    ))}
                  </View>
                </View>
                {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
