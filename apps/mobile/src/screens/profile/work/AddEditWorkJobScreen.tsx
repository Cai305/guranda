import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const LOCATION_TYPES = ['Remote', 'Onsite', 'Hybrid'];

export default function AddEditWorkJobScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const existing = route.params?.job;
  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [category, setCategory] = useState(existing?.category || '');
  const [employmentType, setEmploymentType] = useState(existing?.employmentType || 'Full-time');
  const [locationType, setLocationType] = useState(existing?.locationType || 'Remote');
  const [location, setLocation] = useState(existing?.location || '');
  const [salaryMin, setSalaryMin] = useState(existing?.salaryMin?.toString() || '');
  const [salaryMax, setSalaryMax] = useState(existing?.salaryMax?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    optional: { color: COLORS.textMuted, fontWeight: '400' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#0EA5E9', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  const save = async () => {
    if (!title.trim() || !description.trim()) { setError('Title and description are required'); return; }
    if (locationType !== 'Remote' && !location.trim()) { setError('Location is required for onsite/hybrid roles'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        employmentType,
        locationType,
        location: locationType === 'Remote' ? null : location.trim(),
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
      };
      const res = isEdit
        ? await fetchApi(`/work/jobs/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await fetchApi('/work/jobs', { method: 'POST', body: JSON.stringify(body) });
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Job' : 'Post a Job'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Job Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. React Native Developer" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
        </View>

        <View>
          <Text style={styles.label}>Employment Type</Text>
          <View style={styles.chipRow}>
            {EMPLOYMENT_TYPES.map(t => (
              <TouchableOpacity key={t} style={[styles.chip, employmentType === t && styles.chipActive]} onPress={() => setEmploymentType(t)}>
                <Text style={[styles.chipText, employmentType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Location Type</Text>
          <View style={styles.chipRow}>
            {LOCATION_TYPES.map(t => (
              <TouchableOpacity key={t} style={[styles.chip, locationType === t && styles.chipActive]} onPress={() => setLocationType(t)}>
                <Text style={[styles.chipText, locationType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {locationType !== 'Remote' && (
          <View>
            <Text style={styles.label}>Location *</Text>
            <TextInput style={styles.input} placeholder="e.g. Cape Town" placeholderTextColor={COLORS.textMuted} value={location} onChangeText={setLocation} />
          </View>
        )}

        <View>
          <Text style={styles.label}>Category <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholder="e.g. Engineering" placeholderTextColor={COLORS.textMuted} value={category} onChangeText={setCategory} />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Min Salary (R)</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor={COLORS.textMuted} value={salaryMin} onChangeText={setSalaryMin} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Max Salary (R)</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor={COLORS.textMuted} value={salaryMax} onChangeText={setSalaryMax} keyboardType="decimal-pad" />
          </View>
        </View>

        <View>
          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, { minHeight: 100 }]} placeholder="Describe the role, responsibilities, requirements…" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Post Job'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
