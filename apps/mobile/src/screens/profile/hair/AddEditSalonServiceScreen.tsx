import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

export default function AddEditSalonServiceScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const insets = useSafeAreaInsets();
  const existing = route.params?.service;
  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(existing?.price?.toString() || '');
  const [duration, setDuration] = useState(existing?.duration?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    optional: { color: COLORS.textMuted, fontWeight: '400' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    errorText: { color: '#ef4444', fontSize: 13 },
    // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
    // leaves the button flush against the home indicator / gesture bar on
    // notched devices with no clearance from it.
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#38BDF8', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  const save = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    const parsedPrice = parseFloat(price);
    const parsedDuration = parseInt(duration, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Enter a valid price'); return; }
    if (isNaN(parsedDuration) || parsedDuration <= 0) { setError('Enter a valid duration in minutes'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { title: title.trim(), description: description.trim() || undefined, price: parsedPrice, duration: parsedDuration };
      const res = isEdit
        ? await fetchApi(`/hair/mine/services/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await fetchApi('/hair/mine/services', { method: 'POST', body: JSON.stringify(body) });
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Service' : 'Add Service'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Knotless Box Braids (Medium)" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Price (MSH) *</Text>
            <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Duration (min) *</Text>
            <TextInput style={styles.input} placeholder="180" placeholderTextColor={COLORS.textMuted} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </View>
        </View>
        <View>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="What's included, what to expect…" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Service'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
