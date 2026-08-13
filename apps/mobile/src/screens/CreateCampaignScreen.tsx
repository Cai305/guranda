import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { MODULES } from '../config/modules';

const TYPES = [
  { id: 'BUSINESS', label: 'Business' },
  { id: 'MINI_APP_LAUNCH', label: 'Mini App Launch' },
  { id: 'CREATOR_PROMO', label: 'Creator Promo' },
  { id: 'REVIEWER_RECOMMENDATION', label: 'Reviewer Recommendation' },
];
const GOALS = ['Awareness', 'Installs', 'Visits', 'Reviews'];
const BUDGETED_TYPES = ['BUSINESS', 'MINI_APP_LAUNCH'];
const REPUTATION_LEVELS = ['Nano', 'Micro', 'Midtier', 'Macro', 'Mega Influencer'];
const CAMPAIGN_CATEGORIES = [
  'FASHION', 'FOOD', 'TECH', 'TRAVEL', 'FITNESS', 'BEAUTY', 'FINANCE', 'GAMING', 'MUSIC', 'LIFESTYLE',
];
// Curated destinations for the action button — reuses the exact {name,
// params} route shape every module tile in the app already navigates with
// (see config/modules.ts), so there's no new navigation concept to build.
const DESTINATIONS = MODULES.filter(m => m.route).map(m => ({ label: m.name, route: m.route! }));

export default function CreateCampaignScreen({ navigation }: any) {
  const [type, setType] = useState('BUSINESS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('Awareness');
  const [rewardLabel, setRewardLabel] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [budget, setBudget] = useState('');
  const [days, setDays] = useState('14');
  const [targetMinReputationLevel, setTargetMinReputationLevel] = useState<string | null>(null);
  const [targetCategories, setTargetCategories] = useState<string[]>([]);
  const [actionLabel, setActionLabel] = useState('');
  const [destinationIndex, setDestinationIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const isBudgeted = BUDGETED_TYPES.includes(type);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    hint: { color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.lg, lineHeight: 18 },
    sectionLabel: { ...TYPOGRAPHY.label, marginBottom: 6, marginTop: SPACING.lg },
    label: { ...TYPOGRAPHY.label, marginBottom: 6, marginTop: SPACING.md },
    input: {
      backgroundColor: COLORS.surface, color: COLORS.text, padding: SPACING.md,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    },
    textArea: { minHeight: 80 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.xl },
    submitBtnText: { color: '#fff', fontWeight: '800' },
  }));

  const toggleCategory = (c: string) => {
    setTargetCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));
  };

  const submit = async () => {
    if (!title.trim() || !description.trim() || !rewardLabel.trim() || !actionLabel.trim()) {
      Alert.alert('Missing info', 'Title, description, reward and action button text are required.');
      return;
    }
    if (isBudgeted && !budget.trim()) {
      Alert.alert('Missing info', 'Budget is required for this campaign type.');
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const endAt = new Date(now.getTime() + Number(days || 14) * 86_400_000);
      const destination = DESTINATIONS[destinationIndex];
      const res = await fetchApi('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          goal,
          rewardLabel: rewardLabel.trim(),
          estimatedMinutes: estimatedMinutes.trim() ? Number(estimatedMinutes) : undefined,
          actionLabel: actionLabel.trim(),
          actionRoute: destination ? { name: destination.route.name, params: destination.route.params } : { name: 'Explore' },
          budget: isBudgeted ? Number(budget) : undefined,
          targetMinReputationLevel,
          targetCategories,
          startAt: now.toISOString(),
          endAt: endAt.toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Failed to submit campaign');
      }
      Alert.alert('Submitted', "We'll review your campaign and let you know once it's live.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Create Campaign</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        <Text style={styles.hint}>
          Propose a campaign for the Opportunities carousel. An admin reviews it, and — for Business/Mini App Launch types — your budget is charged from your wallet once approved.
        </Text>

        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t.id} style={[styles.chip, type === t.id && styles.chipActive]} onPress={() => setType(t.id)}>
              <Text style={[styles.chipText, type === t.id && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Campaign title" placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="What is this campaign about?" placeholderTextColor={COLORS.textMuted} multiline />

        <Text style={styles.sectionLabel}>Goal</Text>
        <View style={styles.chipRow}>
          {GOALS.map((g) => (
            <TouchableOpacity key={g} style={[styles.chip, goal === g && styles.chipActive]} onPress={() => setGoal(g)}>
              <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Reward</Text>
        <TextInput style={styles.input} value={rewardLabel} onChangeText={setRewardLabel} placeholder="e.g. R50 cashback, Free trial" placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>Time to complete (minutes, optional)</Text>
        <TextInput style={styles.input} value={estimatedMinutes} onChangeText={setEstimatedMinutes} keyboardType="numeric" placeholder="5" placeholderTextColor={COLORS.textMuted} />

        {isBudgeted && (
          <>
            <Text style={styles.label}>Budget (R)</Text>
            <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="500" placeholderTextColor={COLORS.textMuted} />
          </>
        )}

        <Text style={styles.label}>Runs for (days)</Text>
        <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="numeric" placeholder="14" placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.sectionLabel}>Audience targeting</Text>
        <Text style={styles.hint}>Never affects who can create a campaign — only who sees this one.</Text>
        <Text style={styles.label}>Minimum reputation level</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity style={[styles.chip, targetMinReputationLevel === null && styles.chipActive]} onPress={() => setTargetMinReputationLevel(null)}>
            <Text style={[styles.chipText, targetMinReputationLevel === null && styles.chipTextActive]}>Everyone</Text>
          </TouchableOpacity>
          {REPUTATION_LEVELS.map((l) => (
            <TouchableOpacity key={l} style={[styles.chip, targetMinReputationLevel === l && styles.chipActive]} onPress={() => setTargetMinReputationLevel(l)}>
              <Text style={[styles.chipText, targetMinReputationLevel === l && styles.chipTextActive]}>{l}+</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Interests (optional)</Text>
        <View style={styles.chipRow}>
          {CAMPAIGN_CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, targetCategories.includes(c) && styles.chipActive]} onPress={() => toggleCategory(c)}>
              <Text style={[styles.chipText, targetCategories.includes(c) && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Action button</Text>
        <Text style={styles.label}>Button text</Text>
        <TextInput style={styles.input} value={actionLabel} onChangeText={setActionLabel} placeholder="e.g. Try it, Claim, Learn more" placeholderTextColor={COLORS.textMuted} />
        <Text style={styles.label}>Opens</Text>
        <View style={styles.chipRow}>
          {DESTINATIONS.map((d, i) => (
            <TouchableOpacity key={d.label} style={[styles.chip, destinationIndex === i && styles.chipActive]} onPress={() => setDestinationIndex(i)}>
              <Text style={[styles.chipText, destinationIndex === i && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit for Review</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
