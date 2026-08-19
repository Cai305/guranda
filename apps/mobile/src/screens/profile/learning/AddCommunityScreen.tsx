import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';
import { COURSE_CATEGORIES, ACCENT } from '../../learning/LearningHomeScreen';

export default function AddCommunityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState(COURSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Community name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi('/learning/communities', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), topic, description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create community');
      }
      const community = await res.json();
      navigation.replace('CommunityDetail', { communityId: community.id });
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
        <Text style={styles.headerTitle}>Start a Community</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Home Bakers Club" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>

        <View>
          <Text style={styles.label}>Topic</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {COURSE_CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, topic === cat && styles.chipActive]} onPress={() => setTopic(cat)}>
                <Text style={[styles.chipText, topic === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 100 }]} placeholder="What's this community about?" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Community</Text>}
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
  input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  errorText: { color: '#ef4444', fontSize: 13 },
  // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg
  // leaves the button flush against the home indicator / gesture bar on
  // notched devices with no clearance from it.
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
