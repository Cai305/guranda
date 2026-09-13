import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { BlueprintWithStatsDto, BlueprintStep, BlueprintRunDto, RunBlueprintRequestDto } from '@mxit2/types';

// Same "{{name}}" placeholder shape BlueprintExecutionService.
// resolveInputTemplate matches — kept in sync deliberately so what this
// screen collects lines up exactly with what execution expects.
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

function extractVariableNames(steps: BlueprintStep[]): string[] {
  const names = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      const re = new RegExp(PLACEHOLDER_RE.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(value))) names.add(m[1]);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };
  for (const step of steps) visit(step.inputTemplate);
  return Array.from(names).sort();
}

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

// Blueprint detail + real Purchase/Run/Review flow (Phase 4 Marketplace).
// A Blueprint has no "install" step the way a Feature does — purchasing one
// grants the right to call the real POST /blueprints/versions/:versionId/run
// (BlueprintExecutionService.runBlueprint), which is the real "using" of a
// Blueprint. There is no GET endpoint that reports "have I already
// purchased this Blueprint" (Phase 4 never added one), so this screen
// mirrors FeatureDetailScreen's doPurchaseThenInstall convention of
// treating a real "already purchased" error as a non-fatal, successful
// outcome rather than inventing a fake local purchased flag — the server
// stays the single source of truth for entitlement at every step.
export default function BlueprintDetailScreen({ route, navigation }: any) {
  const { blueprintId } = route.params;
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { user } = useAuth();

  const [blueprint, setBlueprint] = useState<BlueprintWithStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<BlueprintRunDto | null>(null);

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
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14.5 },
    linkBtn: { alignItems: 'center', paddingVertical: 4 },
    linkBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12.5 },
    purchasedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
      borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5,
    },
    purchasedText: { color: '#22C55E', fontWeight: '700', fontSize: 12 },
    sectionLabel: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    sectionCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 14, gap: 10,
    },
    sectionIntro: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
    fieldLabel: { color: COLORS.text, fontWeight: '700', fontSize: 12.5 },
    fieldInput: {
      backgroundColor: COLORS.background, color: COLORS.text, padding: 10,
      borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, fontSize: 13.5,
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
    overallBanner: {
      borderRadius: RADIUS.sm, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    overallBannerSuccess: { backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
    overallBannerFailed: { backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)' },
    overallBannerText: { fontSize: 13, fontWeight: '700' },
    stepCard: {
      backgroundColor: COLORS.background, borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 8,
    },
    stepTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepIndexWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    stepIndexText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    stepName: { color: COLORS.text, fontWeight: '700', fontSize: 13, flex: 1 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
    statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    resultBox: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
      padding: 10,
    },
    resultLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4 },
    resultText: { color: COLORS.text, fontSize: 11.5, fontFamily: 'monospace' as any, lineHeight: 16 },
  }));

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchApi(`/blueprints/${blueprintId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not load this Blueprint.');
      setBlueprint(data as BlueprintWithStatsDto);
    } catch (e: any) {
      setError(e.message || 'Could not load this Blueprint.');
    }
  }, [blueprintId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const isOwner = !!blueprint && user?.userId === blueprint.createdByUserId;
  const isFree = blueprint?.pricingType === 'FREE';
  const canRun = isOwner || isFree || unlocked;

  const latestVersion = useMemo(() => {
    if (!blueprint?.versions || blueprint.versions.length === 0) return null;
    // getBlueprintWithStats orders versions desc by createdAt — [0] is latest.
    return blueprint.versions[0];
  }, [blueprint]);

  const variableNames = useMemo(
    () => (latestVersion ? extractVariableNames(latestVersion.steps) : []),
    [latestVersion],
  );

  useEffect(() => {
    setVariableValues((prev) => {
      const next: Record<string, string> = {};
      for (const name of variableNames) next[name] = prev[name] ?? '';
      return next;
    });
    setRunResult(null);
  }, [variableNames]);

  const doPurchase = async () => {
    setBusy(true);
    try {
      const res = await fetchApi(`/blueprints/${blueprintId}/purchase`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        // Already-purchased is a real, non-fatal outcome — same convention
        // FeatureDetailScreen's doPurchaseThenInstall uses for "already own".
        if (/already purchased/i.test(data?.message || '')) {
          setUnlocked(true);
          Alert.alert('Already purchased', 'You already own this Blueprint — you can run it below.');
          return;
        }
        throw new Error(data?.message || 'Purchase failed.');
      }
      setUnlocked(true);
      await load();
      Alert.alert('Purchased', `"${blueprint?.name}" is now yours to run.`);
    } catch (e: any) {
      Alert.alert('Purchase failed', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleBuy = () => {
    if (!blueprint) return;
    Alert.alert(
      'Confirm purchase',
      `Buy "${blueprint.name}" for ${formatCurrency(blueprint.price)}? This will be debited from your Rand wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy', onPress: doPurchase },
      ],
    );
  };

  const handleRun = async () => {
    if (!blueprint || !latestVersion) return;

    const missing = variableNames.filter((n) => !variableValues[n]?.trim());
    if (missing.length > 0) {
      Alert.alert('Fill in all fields', `This Blueprint needs a value for: ${missing.join(', ')}`);
      return;
    }

    const variables: Record<string, string | number> = {};
    for (const name of variableNames) {
      const raw = variableValues[name].trim();
      variables[name] = NUMERIC_RE.test(raw) ? Number(raw) : raw;
    }

    setRunning(true);
    setRunResult(null);
    try {
      const body: RunBlueprintRequestDto = { variables };
      const res = await fetchApi(`/blueprints/versions/${latestVersion.id}/run`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not run this Blueprint.');
      setRunResult(data as BlueprintRunDto);
    } catch (e: any) {
      Alert.alert('Run failed', e.message || 'Could not run this Blueprint.');
    } finally {
      setRunning(false);
    }
  };

  const submitReview = async () => {
    if (reviewRating < 1) {
      Alert.alert('Pick a rating', 'Tap a star to rate this Blueprint before submitting.');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetchApi(`/blueprints/${blueprintId}/review`, {
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

  if (error || !blueprint) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Blueprint</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error || 'Blueprint not found.'}</Text>
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
        <Text style={TYPOGRAPHY.h2} numberOfLines={1}>{blueprint.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="git-network-outline" size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.name}>{blueprint.name}</Text>
              {blueprint.createdByUser && (
                <Text style={styles.creator}>by @{blueprint.createdByUser.username}</Text>
              )}
            </View>
          </View>

          <Text style={styles.description}>{blueprint.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{blueprint.stats.averageRating > 0 ? blueprint.stats.averageRating.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>{blueprint.stats.reviewCount} review{blueprint.stats.reviewCount === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{blueprint.stats.purchaseCount}</Text>
              <Text style={styles.statLabel}>purchases</Text>
            </View>
          </View>

          {unlocked && !isOwner && (
            <View style={styles.purchasedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <Text style={styles.purchasedText}>Purchased</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            {isFree ? <Text style={styles.freeText}>FREE</Text> : (
              <Text style={styles.priceText}>{formatCurrency(blueprint.price)}</Text>
            )}
          </View>

          {isOwner ? (
            <Text style={styles.emptyBody}>You created this Blueprint.</Text>
          ) : isFree ? (
            <Text style={styles.emptyBody}>Free Blueprints run directly — no purchase needed.</Text>
          ) : unlocked ? null : (
            <>
              <TouchableOpacity style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]} onPress={handleBuy} disabled={busy}>
                {busy ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="card-outline" size={17} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Buy for {formatCurrency(blueprint.price)}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => setUnlocked(true)} disabled={busy}>
                <Text style={styles.linkBtnText}>Already purchased this Blueprint?</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Run this Blueprint</Text>
          {!latestVersion ? (
            <Text style={styles.emptyBody}>This Blueprint has no version to run yet.</Text>
          ) : !canRun ? (
            <Text style={styles.sectionIntro}>Purchase this Blueprint to run it.</Text>
          ) : (
            <>
              {variableNames.length === 0 ? (
                <Text style={styles.sectionIntro}>This Blueprint's steps take no variables — run it as-is.</Text>
              ) : (
                <>
                  <Text style={styles.sectionIntro}>Fill in the values this Blueprint's steps need:</Text>
                  {variableNames.map((name) => (
                    <View key={name} style={{ gap: 4 }}>
                      <Text style={styles.fieldLabel}>{name}</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={variableValues[name] ?? ''}
                        onChangeText={(text) => setVariableValues((prev) => ({ ...prev, [name]: text }))}
                        placeholder={`Value for ${name}…`}
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                      />
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity style={[styles.primaryBtn, running && styles.primaryBtnDisabled]} onPress={handleRun} disabled={running}>
                {running ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="play" size={17} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Run</Text>
                  </>
                )}
              </TouchableOpacity>

              {runResult && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <View style={[
                    styles.overallBanner,
                    runResult.status === 'COMPLETED' ? styles.overallBannerSuccess : styles.overallBannerFailed,
                  ]}>
                    <Ionicons
                      name={runResult.status === 'COMPLETED' ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={runResult.status === 'COMPLETED' ? '#34D399' : '#F87171'}
                    />
                    <Text style={[
                      styles.overallBannerText,
                      { color: runResult.status === 'COMPLETED' ? '#34D399' : '#F87171' },
                    ]}>
                      {runResult.status === 'COMPLETED'
                        ? 'All steps completed successfully'
                        : runResult.errorMessage || 'Stopped on a step failure — see below'}
                    </Text>
                  </View>

                  {runResult.stepResults.map((s, i) => {
                    const color = s.status === 'SUCCESS' ? '#34D399' : '#F87171';
                    return (
                      <View key={`${s.actionName}-${i}`} style={styles.stepCard}>
                        <View style={styles.stepTop}>
                          <View style={[styles.stepIndexWrap, { backgroundColor: color }]}>
                            <Text style={styles.stepIndexText}>{i + 1}</Text>
                          </View>
                          <Text style={styles.stepName} numberOfLines={1}>{s.actionName}</Text>
                          <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
                            <Text style={[styles.statusPillText, { color }]}>{s.status}</Text>
                          </View>
                        </View>
                        <View style={styles.resultBox}>
                          <Text style={[styles.resultLabel, { color }]}>
                            {s.status === 'SUCCESS' ? 'OUTPUT' : 'ERROR'}
                          </Text>
                          <Text style={styles.resultText}>
                            {s.status === 'SUCCESS' ? JSON.stringify(s.output, null, 2) : s.error}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {unlocked && !isOwner && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Rate this Blueprint</Text>
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
          <Text style={styles.sectionLabel}>Reviews ({blueprint.stats.reviewCount})</Text>
          {blueprint.reviews.length === 0 ? (
            <Text style={styles.emptyBody}>No reviews yet.</Text>
          ) : (
            blueprint.reviews.map((r) => (
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
