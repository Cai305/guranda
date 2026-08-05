import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

export default function AddEditHealthPractitionerScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const existing = route.params?.practitioner;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [specialty, setSpecialty] = useState(existing?.specialty || '');
  const [bio, setBio] = useState(existing?.bio || '');
  const [consultationFee, setConsultationFee] = useState(existing?.consultationFee?.toString() || '');
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
    errorText: { color: '#ef4444', fontSize: 13 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#F87171', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  const save = async () => {
    if (!name.trim() || !specialty.trim()) { setError('Name and specialty are required'); return; }
    const parsedFee = parseFloat(consultationFee);
    if (isNaN(parsedFee) || parsedFee <= 0) { setError('Enter a valid consultation fee'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { name: name.trim(), specialty: specialty.trim(), bio: bio.trim(), consultationFee: parsedFee };
      const res = isEdit
        ? await fetchApi(`/health/practitioners/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/health/practitioners', { method: 'POST', body: JSON.stringify(body) });
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Practice' : 'Register Practice'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Dr. Jane Smith" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>
        <View>
          <Text style={styles.label}>Specialty *</Text>
          <TextInput style={styles.input} placeholder="e.g. General Practice" placeholderTextColor={COLORS.textMuted} value={specialty} onChangeText={setSpecialty} />
        </View>
        <View>
          <Text style={styles.label}>Consultation Fee (MSH) *</Text>
          <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textMuted} value={consultationFee} onChangeText={setConsultationFee} keyboardType="decimal-pad" />
        </View>
        <View>
          <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Your experience, qualifications…" placeholderTextColor={COLORS.textMuted} value={bio} onChangeText={setBio} multiline />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Register'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
