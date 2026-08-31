import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const STRUCTURE_TYPES: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'HOA', label: 'HOA / residents', icon: 'home' },
  { id: 'CORPORATE', label: 'Company board', icon: 'briefcase' },
  { id: 'UNION', label: 'Union', icon: 'people' },
  { id: 'CLUB', label: 'Club', icon: 'ribbon' },
  { id: 'STUDENT_BODY', label: 'Student body', icon: 'school' },
  { id: 'OTHER', label: 'Other', icon: 'business' },
];

export default function CreateStructureScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    typeText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    typeTextActive: { color: '#fff' },
    hint: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17 },
    errorText: { color: COLORS.error, fontSize: 13 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  const [name, setName] = useState('');
  const [type, setType] = useState('HOA');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('A name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi('/voting/structures', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create structure');
      }
      const structure = await res.json();
      navigation.replace('StructureDetail', { structureId: structure.id });
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
        <Text style={styles.headerTitle}>Create a structure</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Riverside Residents Association" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>

        <View>
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {STRUCTURE_TYPES.map((t) => (
              <TouchableOpacity key={t.id} style={[styles.typeChip, type === t.id && styles.typeChipActive]} onPress={() => setType(t.id)}>
                <Ionicons name={t.icon} size={14} color={type === t.id ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.typeText, type === t.id && styles.typeTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>You'll be the admin — add members to the roll and set up elections from the structure page next.</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create structure</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
