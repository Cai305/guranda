import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../theme';
import { fetchApi } from '../utils/api';

export default function CouplesChallengesScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState('');
  const [completing, setCompleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/couples/challenges')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openLevel = (template: any) => {
    if (template.status === 'locked') return;
    setSelected(template);
    setNote('');
  };

  const complete = async () => {
    if (!selected) return;
    setCompleting(true);
    try {
      const res = await fetchApi(`/couples/challenges/${selected.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || 'Failed to complete');
      }
      setSelected(null);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.root}><ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} /></SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Couples Challenges</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted, textAlign: 'center' }}>
            Link up with a partner from Edit Profile to unlock Couples Challenges.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Couples Challenges</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.rankCard}>
        <Ionicons name="heart" size={20} color="#F43F5E" />
        <Text style={styles.rankText}>{data.relationship.rank}</Text>
        <Text style={styles.xpText}>{data.relationship.xp} XP · {data.relationship.currentStreak}🔥 streak</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        {data.templates.map((t: any) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.levelCard, t.status === 'locked' && styles.levelCardLocked]}
            onPress={() => openLevel(t)}
            activeOpacity={t.status === 'locked' ? 1 : 0.8}
          >
            <View style={[styles.levelBadge, t.status === 'completed' && styles.levelBadgeDone]}>
              {t.status === 'locked' ? (
                <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
              ) : t.status === 'completed' ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={styles.levelNum}>{t.level}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.levelTitle, t.status === 'locked' && styles.levelTitleLocked]}>{t.title}</Text>
              <Text style={styles.levelDesc} numberOfLines={t.status === 'locked' ? 1 : 2}>
                {t.status === 'locked' ? 'Complete the earlier levels first' : t.description}
              </Text>
            </View>
            {t.status !== 'locked' && (
              <Text style={styles.xpBadge}>{t.xpReward} XP</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <Text style={TYPOGRAPHY.h3}>{selected.title}</Text>
                <Text style={styles.modalDesc}>{selected.description}</Text>
                {selected.status === 'unlocked' && (
                  <>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Add a note (optional)"
                      placeholderTextColor={COLORS.textMuted}
                      value={note}
                      onChangeText={setNote}
                      multiline
                    />
                    <TouchableOpacity style={styles.completeBtn} onPress={complete} disabled={completing}>
                      {completing ? <ActivityIndicator color="#fff" /> : <Text style={styles.completeBtnText}>Mark Complete</Text>}
                    </TouchableOpacity>
                  </>
                )}
                {selected.status === 'completed' && !!selected.note && (
                  <Text style={styles.modalNote}>"{selected.note}"</Text>
                )}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  rankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: 'rgba(244,63,94,0.12)', borderRadius: RADIUS.md, padding: SPACING.md,
  },
  rankText: { color: '#F43F5E', fontWeight: '800', fontSize: 14 },
  xpText: { color: COLORS.textMuted, fontSize: 12, marginLeft: 'auto' },
  levelCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  levelCardLocked: { opacity: 0.5 },
  levelBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.glassBorder, justifyContent: 'center', alignItems: 'center',
  },
  levelBadgeDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  levelNum: { color: COLORS.text, fontWeight: '800', fontSize: 12 },
  levelTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  levelTitleLocked: { color: COLORS.textMuted },
  levelDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  xpBadge: { color: COLORS.gold, fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  modalDesc: { color: COLORS.textMuted, fontSize: 14, marginTop: 8, marginBottom: 12, lineHeight: 20 },
  modalNote: { color: COLORS.text, fontStyle: 'italic', fontSize: 13, marginBottom: 12 },
  noteInput: {
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, minHeight: 60, marginBottom: 12,
  },
  completeBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: '800' },
  closeBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  closeBtnText: { color: COLORS.textMuted, fontWeight: '600' },
});
