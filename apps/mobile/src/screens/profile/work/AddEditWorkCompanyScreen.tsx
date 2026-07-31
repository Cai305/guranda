import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function AddEditWorkCompanyScreen({ navigation, route }: any) {
  const existing = route.params?.company;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [industry, setIndustry] = useState(existing?.industry || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [website, setWebsite] = useState(existing?.website || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Company name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { name: name.trim(), industry: industry.trim(), description: description.trim(), website: website.trim() };
      const res = isEdit
        ? await fetchApi(`/work/companies/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/work/companies', { method: 'POST', body: JSON.stringify(body) });
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Company' : 'Register Company'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Company Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Guranda Labs" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>
        <View>
          <Text style={styles.label}>Industry</Text>
          <TextInput style={styles.input} placeholder="e.g. Technology" placeholderTextColor={COLORS.textMuted} value={industry} onChangeText={setIndustry} />
        </View>
        <View>
          <Text style={styles.label}>Website</Text>
          <TextInput style={styles.input} placeholder="https://…" placeholderTextColor={COLORS.textMuted} value={website} onChangeText={setWebsite} autoCapitalize="none" />
        </View>
        <View>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="What does your company do?" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Register Company'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  optional: { color: COLORS.textMuted, fontWeight: '400' },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 13 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: '#0EA5E9', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
