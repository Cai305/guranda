import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

const CATEGORIES = [
  'DANCE', 'COMEDY', 'FITNESS', 'GAMING', 'PHOTOGRAPHY', 'COOKING',
  'BUSINESS', 'MUSIC', 'LIFESTYLE', 'SPORTS', 'COUPLES', 'SPONSORED',
];
const TYPES = ['DAILY', 'FLASH', 'WEEKEND', 'SEASONAL', 'SPONSORED'];

export default function SponsorChallengeScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [category, setCategory] = useState('SPONSORED');
  const [type, setType] = useState('SPONSORED');
  const [budget, setBudget] = useState('');
  const [days, setDays] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    hint: { color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.lg, lineHeight: 18 },
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

  const submit = async () => {
    if (!title.trim() || !description.trim() || !budget.trim()) {
      Alert.alert('Missing info', 'Title, description, and budget are required.');
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const endAt = new Date(now.getTime() + Number(days || 7) * 86_400_000);
      const res = await fetchApi('/challenges/sponsorships', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          promptText: promptText.trim() || undefined,
          category,
          type,
          startAt: now.toISOString(),
          endAt: endAt.toISOString(),
          budget: Number(budget),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Failed to submit sponsorship');
      }
      Alert.alert('Submitted', "We'll review your sponsorship and let you know once it's live.");
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
        <Text style={TYPOGRAPHY.h2}>Sponsor a Challenge</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        <Text style={styles.hint}>
          Propose a challenge for your business to sponsor. An admin reviews it, and your budget is charged from your wallet once approved.
        </Text>

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Challenge title" placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="What should people submit?" placeholderTextColor={COLORS.textMuted} multiline />

        <Text style={styles.label}>Prompt (optional)</Text>
        <TextInput style={styles.input} value={promptText} onChangeText={setPromptText} placeholder="A short hook" placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Runs for (days)</Text>
        <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="numeric" placeholder="7" placeholderTextColor={COLORS.textMuted} />

        <Text style={styles.label}>Budget (R)</Text>
        <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="500" placeholderTextColor={COLORS.textMuted} />

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit for Review</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
