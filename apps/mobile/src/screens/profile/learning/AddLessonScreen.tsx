import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';
import { ACCENT } from '../../learning/LearningHomeScreen';

export default function AddLessonScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const { courseId } = route.params;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [durationMin, setDurationMin] = useState('10');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) { setError('Lesson title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi(`/learning/courses/${courseId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim() || undefined, durationMin: parseInt(durationMin, 10) || 10 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add lesson');
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg leaves the button flush against the home indicator / gesture bar on notched devices with no clearance from it.
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Lesson</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Lesson 1: Ingredients" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
        </View>

        <View>
          <Text style={styles.label}>Content</Text>
          <TextInput style={[styles.input, { minHeight: 140 }]} placeholder="Lesson notes or script…" placeholderTextColor={COLORS.textMuted} value={content} onChangeText={setContent} multiline />
        </View>

        <View>
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" placeholder="10" placeholderTextColor={COLORS.textMuted} value={durationMin} onChangeText={setDurationMin} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Lesson</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
