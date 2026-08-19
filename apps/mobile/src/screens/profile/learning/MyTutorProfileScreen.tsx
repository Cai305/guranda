import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';
import { ACCENT } from '../../learning/LearningHomeScreen';

export default function MyTutorProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hourlyRate, setHourlyRate] = useState('10');
  const [bio, setBio] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/learning/tutors/mine');
      const data = res.ok ? await res.json() : null;
      setTutor(data);
      if (data) {
        setName(data.name);
        setSubjects(data.subjects);
        setHourlyRate(String(data.hourlyRate));
        setBio(data.bio || '');
      }
    } catch { setTutor(null); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!name.trim() || !subjects.trim() || !hourlyRate) { setError('Name, subjects and hourly rate are required'); return; }
    setSaving(true);
    setError('');
    try {
      const isEdit = !!tutor;
      const res = await fetchApi(isEdit ? '/learning/tutors/mine' : '/learning/tutors', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify({ name: name.trim(), subjects: subjects.trim(), hourlyRate: parseFloat(hourlyRate) || 0, bio: bio.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }
      await load();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tutor ? 'My Tutor Profile' : 'Become a Tutor'}</Text>
        {tutor ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('TutorSessions')}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        ) : <View style={{ width: 30 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="Your tutor display name" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>
        <View>
          <Text style={styles.label}>Subjects *</Text>
          <TextInput style={styles.input} placeholder="e.g. Mathematics, Physics" placeholderTextColor={COLORS.textMuted} value={subjects} onChangeText={setSubjects} />
        </View>
        <View>
          <Text style={styles.label}>Hourly rate (R) *</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="10" placeholderTextColor={COLORS.textMuted} value={hourlyRate} onChangeText={setHourlyRate} />
        </View>
        <View>
          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, { minHeight: 100 }]} placeholder="Your teaching experience…" placeholderTextColor={COLORS.textMuted} value={bio} onChangeText={setBio} multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{tutor ? 'Save Changes' : 'Register as Tutor'}</Text>}
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
  iconBtn: { padding: 6 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 13 },
  // paddingBottom set dynamically via insets in JSX — a flat SPACING.lg leaves the button flush against the home indicator / gesture bar on notched devices with no clearance from it.
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
