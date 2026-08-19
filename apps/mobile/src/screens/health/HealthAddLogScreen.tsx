import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const LOG_TYPES = [
  { key: 'workout', label: 'Workout', icon: 'barbell', unit: 'min' },
  { key: 'weight', label: 'Weight', icon: 'scale', unit: 'kg' },
  { key: 'steps', label: 'Steps', icon: 'walk', unit: 'steps' },
  { key: 'water', label: 'Water', icon: 'water', unit: 'ml' },
];

export default function HealthAddLogScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    optional: { color: COLORS.textMuted, fontWeight: '400' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: '#F87171', borderColor: '#F87171' },
    chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#F87171', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));
  const [type, setType] = useState('workout');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = LOG_TYPES.find(t => t.key === type)!;

  const save = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) { setError('Enter a valid value'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi('/health/fitness/logs', {
        method: 'POST',
        body: JSON.stringify({ type, value: parsed, unit: selected.unit, note: note.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log an entry</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {LOG_TYPES.map(t => (
              <TouchableOpacity key={t.key} style={[styles.chip, type === t.key && styles.chipActive]} onPress={() => setType(t.key)}>
                <Ionicons name={t.icon as any} size={14} color={type === t.key ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Value ({selected.unit})</Text>
          <TextInput style={styles.input} placeholder="0" placeholderTextColor={COLORS.textMuted} value={value} onChangeText={setValue} keyboardType="decimal-pad" />
        </View>

        <View>
          <Text style={styles.label}>Note <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Any details…" placeholderTextColor={COLORS.textMuted} value={note} onChangeText={setNote} multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Log</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
