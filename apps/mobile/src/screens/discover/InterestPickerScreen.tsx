import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

const ALL_INTERESTS = [
  { key: 'Gaming', icon: 'game-controller-outline' },
  { key: 'Music', icon: 'musical-notes-outline' },
  { key: 'Education', icon: 'school-outline' },
  { key: 'Cooking', icon: 'restaurant-outline' },
  { key: 'Sports', icon: 'football-outline' },
  { key: 'Comedy', icon: 'happy-outline' },
  { key: 'Technology', icon: 'hardware-chip-outline' },
  { key: 'Fashion', icon: 'shirt-outline' },
  { key: 'Travel', icon: 'airplane-outline' },
  { key: 'Fitness', icon: 'barbell-outline' },
  { key: 'Art', icon: 'color-palette-outline' },
  { key: 'Science', icon: 'flask-outline' },
  { key: 'News', icon: 'newspaper-outline' },
  { key: 'DIY', icon: 'hammer-outline' },
  { key: 'Finance', icon: 'trending-up-outline' },
] as const;

export default function InterestPickerScreen({ navigation, route }: any) {
  const { onSave } = route.params ?? {};
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchApi('/videos/interests')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSelected(d.map((i: any) => i.category ?? i)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  const toggle = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetchApi('/videos/interests', { method: 'PATCH', body: JSON.stringify({ interests: selected }) });
      onSave?.();
      navigation.goBack();
    } catch { }
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Your Interests</Text>
          <Text style={styles.subtitle}>Pick topics to personalise your Discovery feed</Text>
        </View>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {ALL_INTERESTS.map(({ key, icon }) => {
            const active = selected.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tile, active && styles.tileActive]}
                onPress={() => toggle(key)}
                activeOpacity={0.7}
              >
                <Ionicons name={icon as any} size={28} color={active ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.tileText, active && styles.tileTextActive]}>{key}</Text>
                {active && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerHint}>{selected.length} selected</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 8 },
  back: { padding: 4 },
  headerCenter: { flex: 1 },
  title: { ...TYPOGRAPHY.h2, fontSize: 18 },
  subtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.lg, gap: 12 },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  tileActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tileText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  tileTextActive: { color: '#fff' },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: { paddingHorizontal: SPACING.lg, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border },
  footerHint: { color: COLORS.textMuted, fontSize: 12 },
});
