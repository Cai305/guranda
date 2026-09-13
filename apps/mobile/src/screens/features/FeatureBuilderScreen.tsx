import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { FeatureDraftDto } from '@mxit2/types';

// Feature Builder (architecture Phase 3) — "What do you want Guranda to
// do?" in natural language, and a real LLM call (POST /features/builder/
// draft) composes a plan from the app's REAL, live action/widget catalog.
// Nothing here is auto-published: a draft only ever becomes a real,
// installable Feature via the explicit "Save as Draft" action below, which
// still leaves it in DRAFT status (Marketplace publish is Phase 4, not
// this screen's job).
export default function FeatureBuilderScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FeatureDraftDto | null>(null);
  const [saving, setSaving] = useState(false);

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
    intro: { color: COLORS.textMuted, fontSize: 12.5, lineHeight: 18 },
    inputCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 14, gap: 10,
    },
    input: {
      backgroundColor: COLORS.background, color: COLORS.text, padding: 12,
      borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
      minHeight: 90, textAlignVertical: 'top', fontSize: 14.5,
    },
    generateBtn: {
      backgroundColor: COLORS.primary, padding: 14, borderRadius: RADIUS.sm,
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    generateBtnDisabled: { opacity: 0.5 },
    generateBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    errorBox: {
      backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
      borderRadius: RADIUS.sm, padding: 12,
    },
    errorText: { color: '#F87171', fontSize: 13, lineHeight: 18 },
    draftCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, padding: 16, gap: 14,
    },
    draftHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    draftIconWrap: {
      width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.background,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    draftName: { color: COLORS.text, fontWeight: '800', fontSize: 17, flex: 1 },
    draftCategory: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    draftDescription: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
    sectionLabel: { color: COLORS.text, fontWeight: '700', fontSize: 13, marginBottom: 6 },
    stepRow: {
      flexDirection: 'row', gap: 10, backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
      borderWidth: 1, borderColor: COLORS.border, padding: 10,
    },
    stepNumberWrap: {
      width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    stepNumberText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    stepBody: { flex: 1, gap: 2 },
    stepName: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    stepDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16 },
    sensitiveTag: { color: '#F59E0B', fontSize: 10.5, fontWeight: '700', marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
      borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5,
    },
    chipText: { color: COLORS.textMuted, fontSize: 11.5, fontWeight: '600' },
    notesBox: {
      backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
      borderRadius: RADIUS.sm, padding: 12, gap: 6,
    },
    notesTitle: { color: '#F59E0B', fontWeight: '700', fontSize: 12.5 },
    noteText: { color: COLORS.text, fontSize: 12.5, lineHeight: 17 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    secondaryBtn: {
      flex: 1, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.sm, padding: 13, alignItems: 'center',
    },
    secondaryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 13.5 },
    primaryBtn: {
      flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 13, alignItems: 'center',
    },
    primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13.5 },
    emptyState: { alignItems: 'center', paddingVertical: 50, gap: 10, paddingHorizontal: 20 },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    emptyBody: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  }));

  const generate = async () => {
    if (!description.trim() || description.trim().length < 3) {
      Alert.alert('Tell it more', 'Describe what you want Guranda to do (at least a few words).');
      return;
    }
    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetchApi('/features/builder/draft', {
        method: 'POST',
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not generate a draft.');
      setDraft(data as FeatureDraftDto);
    } catch (e: any) {
      setError(e.message || 'Something went wrong generating this draft.');
    } finally {
      setLoading(false);
    }
  };

  const saveAsDraft = async () => {
    if (!draft) return;
    if (draft.actions.length === 0) {
      Alert.alert('Nothing to save', 'This draft has no valid actions yet — try rephrasing your request.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetchApi('/features/builder/save-draft', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          category: draft.category,
          icon: draft.icon,
          actionNames: draft.actions.map((a) => a.actionName),
          widgetIds: draft.widgetIds,
          permissionsRequired: draft.permissionsRequired,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not save this Feature.');
      Alert.alert(
        'Saved',
        `"${draft.name}" was saved as a draft Feature. Publish it to the Marketplace now, or find it later and publish then.`,
        [
          { text: 'Not now', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Publish to Marketplace', onPress: () => publishFeature(data.id, draft.name) },
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save this Feature.');
    } finally {
      setSaving(false);
    }
  };

  const publishFeature = async (featureId: string, name: string) => {
    try {
      const res = await fetchApi(`/features/${featureId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not publish this Feature.');
      Alert.alert('Published', `"${name}" is now live on the Marketplace.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Publish failed', e.message || 'Could not publish this Feature.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const testInWorkshop = () => {
    if (!draft) return;
    if (draft.actions.length === 0) {
      Alert.alert('Nothing to test', 'This draft has no valid actions yet — try rephrasing your request.');
      return;
    }
    navigation.navigate('FeatureWorkshop', { draft });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Feature Builder</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Describe what you want Guranda to do, in your own words. The AI composes a plan from the real actions and widgets that already exist in the app — nothing invented, nothing published automatically.
          </Text>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder='e.g. "Let me request a ride and then check its status"'
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={2000}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.generateBtn, (loading || !description.trim()) && styles.generateBtnDisabled]}
              onPress={generate}
              disabled={loading || !description.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={17} color="#FFF" />
                  <Text style={styles.generateBtnText}>Generate Feature</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {draft && (
            <View style={styles.draftCard}>
              <View style={styles.draftHeaderRow}>
                <View style={styles.draftIconWrap}>
                  <Ionicons name={(draft.icon as any) || 'sparkles-outline'} size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.draftName}>{draft.name}</Text>
                  <Text style={styles.draftCategory}>{draft.category}</Text>
                </View>
              </View>
              <Text style={styles.draftDescription}>{draft.description}</Text>

              <View>
                <Text style={styles.sectionLabel}>
                  {draft.actions.length > 0 ? `Steps (${draft.actions.length})` : 'Steps'}
                </Text>
                {draft.actions.length === 0 ? (
                  <Text style={styles.stepDesc}>No achievable actions were found for this request — see the note below.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {draft.actions.map((a, i) => (
                      <View key={`${a.actionName}-${i}`} style={styles.stepRow}>
                        <View style={styles.stepNumberWrap}>
                          <Text style={styles.stepNumberText}>{i + 1}</Text>
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepName}>{a.actionName}</Text>
                          <Text style={styles.stepDesc}>{a.description}</Text>
                          {a.sensitive && <Text style={styles.sensitiveTag}>Requires approval each time (sensitive action)</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {draft.widgetIds.length > 0 && (
                <View>
                  <Text style={styles.sectionLabel}>Widgets used</Text>
                  <View style={styles.chipsRow}>
                    {draft.widgetIds.map((id) => (
                      <View key={id} style={styles.chip}>
                        <Text style={styles.chipText}>{id}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {draft.permissionsRequired.length > 0 && (
                <View>
                  <Text style={styles.sectionLabel}>Permissions required</Text>
                  <View style={styles.chipsRow}>
                    {draft.permissionsRequired.map((p) => (
                      <View key={p} style={styles.chip}>
                        <Text style={styles.chipText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {draft.unachievableNotes.length > 0 && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>Honest limitations</Text>
                  {draft.unachievableNotes.map((n, i) => (
                    <Text key={i} style={styles.noteText}>• {n}</Text>
                  ))}
                </View>
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={testInWorkshop} disabled={draft.actions.length === 0}>
                  <Text style={styles.secondaryBtnText}>Test in Workshop</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={saveAsDraft} disabled={saving || draft.actions.length === 0}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save as Draft</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!draft && !loading && !error && (
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Describe a Feature to get started</Text>
              <Text style={styles.emptyBody}>Try something like "let people rate my ride" or "post to a platform I haven't connected" to see how it responds either way.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
