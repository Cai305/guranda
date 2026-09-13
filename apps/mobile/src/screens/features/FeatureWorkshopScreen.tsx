import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { FeatureDraftActionDto, FeatureDraftDto, FeatureTestRunStepDto, ToolRegistryEntryDto } from '@mxit2/types';

type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'not-reached';

interface StepState {
  action: FeatureDraftActionDto;
  status: StepStatus;
  output?: unknown;
  error?: string;
  durationMs?: number;
  inputJson: string;
}

// Feature Workshop (architecture Phase 3) — "test the draft/saved Feature
// step-by-step before it's real". Calls the REAL POST /features/builder/
// test-run, which runs each step through the real ActionExecutorService —
// this is a sandbox in the sense of "not yet published", never "faked".
// Every step should be inspectable and a failure must never be hidden.
export default function FeatureWorkshopScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;

  const draft: FeatureDraftDto | undefined = route.params?.draft;
  const rawActionNames: string[] | undefined = route.params?.actionNames;
  const title = draft?.name || route.params?.featureName || 'Feature Workshop';

  const [steps, setSteps] = useState<StepState[] | null>(draft ? draft.actions.map(toStepState) : null);
  const [loadingCatalog, setLoadingCatalog] = useState(!draft && !!rawActionNames);
  const [running, setRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'success' | 'failed' | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (draft || !rawActionNames || rawActionNames.length === 0) return;
    let cancelled = false;
    fetchApi('/tools')
      .then((r) => (r.ok ? r.json() : []))
      .then((tools: ToolRegistryEntryDto[]) => {
        if (cancelled) return;
        const byName = new Map(tools.map((t) => [t.name, t]));
        const built = rawActionNames.map((name) => {
          const t = byName.get(name);
          const action: FeatureDraftActionDto = {
            actionName: name,
            description: t?.description ?? '(action no longer exists in the registry)',
            permissionKey: t?.permissionKey ?? '',
            sensitive: t?.sensitive ?? false,
            renderAs: t?.renderAs ?? null,
            inputSchema: t?.inputSchema ?? {},
          };
          return toStepState(action);
        });
        setSteps(built);
      })
      .finally(() => !cancelled && setLoadingCatalog(false));
    return () => { cancelled = true; };
  }, [draft, rawActionNames]);

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
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 80, gap: 12 },
    intro: { color: COLORS.textMuted, fontSize: 12.5, lineHeight: 18, marginBottom: 4 },
    overallBanner: {
      borderRadius: RADIUS.sm, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    overallBannerSuccess: { backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
    overallBannerFailed: { backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)' },
    overallBannerText: { fontSize: 13, fontWeight: '700' },
    stepCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 14, gap: 8,
    },
    stepTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepIndexWrap: {
      width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    },
    stepIndexText: { color: '#FFF', fontSize: 11.5, fontWeight: '800' },
    stepName: { color: COLORS.text, fontWeight: '700', fontSize: 14, flex: 1 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
    statusPillText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
    stepDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16 },
    durationText: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    resultBox: {
      backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
      padding: 10, marginTop: 4,
    },
    resultLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4 },
    resultText: { color: COLORS.text, fontSize: 11.5, fontFamily: 'monospace' as any, lineHeight: 16 },
    inputToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    inputToggleText: { color: COLORS.primary, fontSize: 11.5, fontWeight: '700' },
    inputEditor: {
      backgroundColor: COLORS.background, color: COLORS.text, borderRadius: RADIUS.sm,
      borderWidth: 1, borderColor: COLORS.border, padding: 10, fontSize: 12, fontFamily: 'monospace' as any,
      minHeight: 70, textAlignVertical: 'top', marginTop: 6,
    },
    schemaHint: { color: COLORS.textMuted, fontSize: 10.5, marginTop: 4, lineHeight: 14 },
    runBtn: {
      backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 15, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6,
    },
    runBtnDisabled: { opacity: 0.5 },
    runBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    emptyState: { alignItems: 'center', paddingVertical: 50, gap: 10, paddingHorizontal: 20 },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    emptyBody: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  }));

  function statusColor(status: StepStatus): string {
    switch (status) {
      case 'success': return '#34D399';
      case 'failed': return '#F87171';
      case 'running': return COLORS.primary;
      case 'not-reached': return COLORS.textMuted;
      default: return COLORS.textMuted;
    }
  }

  function statusLabel(status: StepStatus): string {
    switch (status) {
      case 'success': return 'SUCCESS';
      case 'failed': return 'FAILED';
      case 'running': return 'RUNNING';
      case 'not-reached': return 'NOT REACHED';
      default: return 'PENDING';
    }
  }

  const runTest = async () => {
    if (!steps || steps.length === 0) return;
    setRunning(true);
    setOverallStatus(null);
    setSteps((prev) => prev!.map((s) => ({ ...s, status: 'running', output: undefined, error: undefined, durationMs: undefined })));

    try {
      const testInput = steps.map((s) => {
        try {
          const parsed = JSON.parse(s.inputJson || '{}');
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
          return {};
        }
      });
      const res = await fetchApi('/features/builder/test-run', {
        method: 'POST',
        body: JSON.stringify({
          actionNames: steps.map((s) => s.action.actionName),
          testInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Test run failed');

      const resultSteps: FeatureTestRunStepDto[] = data.steps ?? [];
      setSteps((prev) =>
        prev!.map((s, i) => {
          const r = resultSteps[i];
          if (!r) {
            // The run stopped before reaching this step — never render it
            // as if it silently succeeded.
            return { ...s, status: 'not-reached', output: undefined, error: undefined, durationMs: undefined };
          }
          return { ...s, status: r.status, output: r.output, error: r.error, durationMs: r.durationMs };
        }),
      );
      setOverallStatus(data.overallStatus === 'failed' ? 'failed' : 'success');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Test run failed');
      setSteps((prev) => prev!.map((s) => (s.status === 'running' ? { ...s, status: 'pending' } : s)));
    } finally {
      setRunning(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingCatalog || steps === null ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : steps.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flask-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nothing to test</Text>
          <Text style={styles.emptyBody}>This draft has no valid steps.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.intro}>
            Real execution against the real dev environment — each step below really calls its action. Edit a step's test input (JSON) if it needs specific values, then run.
          </Text>

          {overallStatus && (
            <View style={[styles.overallBanner, overallStatus === 'success' ? styles.overallBannerSuccess : styles.overallBannerFailed]}>
              <Ionicons
                name={overallStatus === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={overallStatus === 'success' ? '#34D399' : '#F87171'}
              />
              <Text style={[styles.overallBannerText, { color: overallStatus === 'success' ? '#34D399' : '#F87171' }]}>
                {overallStatus === 'success' ? 'All steps completed successfully' : 'Stopped on a step failure — see below'}
              </Text>
            </View>
          )}

          {steps.map((s, i) => (
            <View key={`${s.action.actionName}-${i}`} style={styles.stepCard}>
              <View style={styles.stepTop}>
                <View style={[styles.stepIndexWrap, { backgroundColor: statusColor(s.status) }]}>
                  {s.status === 'running' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.stepIndexText}>{i + 1}</Text>
                  )}
                </View>
                <Text style={styles.stepName} numberOfLines={1}>{s.action.actionName}</Text>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor(s.status)}22` }]}>
                  <Text style={[styles.statusPillText, { color: statusColor(s.status) }]}>{statusLabel(s.status)}</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>{s.action.description}</Text>
              {typeof s.durationMs === 'number' && <Text style={styles.durationText}>{s.durationMs}ms</Text>}

              <TouchableOpacity
                style={styles.inputToggle}
                onPress={() => setExpandedIndex(expandedIndex === i ? null : i)}
              >
                <Ionicons name={expandedIndex === i ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.primary} />
                <Text style={styles.inputToggleText}>{expandedIndex === i ? 'Hide test input' : 'Edit test input'}</Text>
              </TouchableOpacity>
              {expandedIndex === i && (
                <>
                  <TextInput
                    style={styles.inputEditor}
                    value={s.inputJson}
                    onChangeText={(text) =>
                      setSteps((prev) => prev!.map((st, idx) => (idx === i ? { ...st, inputJson: text } : st)))
                    }
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.schemaHint}>
                    Expected shape: {JSON.stringify(s.action.inputSchema?.properties ?? s.action.inputSchema ?? {})}
                  </Text>
                </>
              )}

              {(s.status === 'success' || s.status === 'failed') && (
                <View style={styles.resultBox}>
                  <Text style={[styles.resultLabel, { color: statusColor(s.status) }]}>
                    {s.status === 'success' ? 'OUTPUT' : 'ERROR'}
                  </Text>
                  <Text style={styles.resultText}>
                    {s.status === 'success' ? JSON.stringify(s.output, null, 2) : s.error}
                  </Text>
                </View>
              )}
              {s.status === 'not-reached' && (
                <View style={styles.resultBox}>
                  <Text style={[styles.resultLabel, { color: COLORS.textMuted }]}>NOT REACHED</Text>
                  <Text style={styles.resultText}>The run stopped at an earlier step before this one could execute.</Text>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={[styles.runBtn, running && styles.runBtnDisabled]} onPress={runTest} disabled={running}>
            {running ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="play" size={17} color="#FFF" />
                <Text style={styles.runBtnText}>Run Test</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function toStepState(action: FeatureDraftActionDto): StepState {
  return { action, status: 'pending', inputJson: '{}' };
}
