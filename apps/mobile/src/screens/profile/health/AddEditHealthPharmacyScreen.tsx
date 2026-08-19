import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function AddEditHealthPharmacyScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const existing = route.params?.pharmacy;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Pharmacy name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { name: name.trim(), address: address.trim(), description: description.trim() };
      const res = isEdit
        ? await fetchApi(`/health/pharmacies/${existing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await fetchApi('/health/pharmacies', { method: 'POST', body: JSON.stringify(body) });
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Pharmacy' : 'Register Pharmacy'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Pharmacy Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. City Pharmacy" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>
        <View>
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} placeholder="e.g. 1 Main Street" placeholderTextColor={COLORS.textMuted} value={address} onChangeText={setAddress} />
        </View>
        <View>
          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="What do you offer?" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Register Pharmacy'}</Text>}
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
  // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
  // leaves the button flush against the home indicator / gesture bar on
  // notched devices with no clearance from it.
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: '#F87171', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
