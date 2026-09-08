import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

interface Memory {
  id: string;
  label: string;
  detail: string;
  source: 'user' | 'ai';
  enabled: boolean;
  createdAt: string;
}

// Settings > AI Memory (architecture Phase 15.2/16) — real, user-managed
// facts the agent should keep in mind. No tool writes to this yet (a future
// agent capability, not this screen's job) — for now every memory here is
// one the user added themselves, with real view/edit/delete/disable.
export default function AiMemoryScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetchApi('/ai/memories')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setMemories(Array.isArray(d) ? d : []))
      .catch(() => setMemories([]));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    addBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    intro: { paddingHorizontal: SPACING.lg, color: COLORS.textMuted, fontSize: 12.5, lineHeight: 18, marginBottom: SPACING.lg },
    list: { paddingHorizontal: SPACING.lg, gap: 10, paddingBottom: 40 },
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardLabel: { color: COLORS.text, fontWeight: '700', fontSize: 14.5, flex: 1 },
    cardLabelDisabled: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
    cardDetail: { color: COLORS.textMuted, fontSize: 12.5, marginTop: 6, lineHeight: 17 },
    cardActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
    actionLink: { fontSize: 11.5, fontWeight: '700' },
    sourceTag: { fontSize: 9.5, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.4 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 40 },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    emptyBody: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
    modalContent: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    input: {
      backgroundColor: COLORS.surface, color: COLORS.text, padding: 12,
      borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, marginTop: 6,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: RADIUS.sm, alignItems: 'center', marginTop: 16 },
  }));

  const openAdd = () => {
    setEditingId(null);
    setLabel('');
    setDetail('');
    setModalVisible(true);
  };

  const openEdit = (m: Memory) => {
    setEditingId(m.id);
    setLabel(m.label);
    setDetail(m.detail);
    setModalVisible(true);
  };

  const save = async () => {
    if (!label.trim() || !detail.trim()) {
      Alert.alert('Missing info', 'Give it both a short label and a detail.');
      return;
    }
    setSaving(true);
    try {
      const res = editingId
        ? await fetchApi(`/ai/memories/${editingId}`, { method: 'PATCH', body: JSON.stringify({ label, detail }) })
        : await fetchApi('/ai/memories', { method: 'POST', body: JSON.stringify({ label, detail }) });
      if (!res.ok) throw new Error();
      setModalVisible(false);
      load();
    } catch {
      Alert.alert('Error', 'Could not save this memory.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (m: Memory) => {
    setMemories((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, enabled: !x.enabled } : x)));
    const res = await fetchApi(`/ai/memories/${m.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !m.enabled }) });
    if (!res.ok) load(); // revert on failure
  };

  const remove = (m: Memory) => {
    Alert.alert('Delete memory', `Forget "${m.label}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setMemories((prev) => prev && prev.filter((x) => x.id !== m.id));
          const res = await fetchApi(`/ai/memories/${m.id}`, { method: 'DELETE' });
          if (!res.ok) load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>AI Memory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} accessibilityLabel="Add a memory">
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.intro}>
        Facts your AI keeps in mind across conversations. Add something yourself, or disable/delete anything you'd rather it forgot.
      </Text>

      {memories === null ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bulb-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nothing remembered yet</Text>
          <Text style={styles.emptyBody}>Add a preference or fact you want your AI to keep in mind — like a spending limit or a preferred way to travel.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {memories.map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardLabel, !m.enabled && styles.cardLabelDisabled]} numberOfLines={1}>{m.label}</Text>
                <Text style={styles.sourceTag}>{m.source === 'ai' ? 'FROM AI' : 'YOU ADDED'}</Text>
                <Switch
                  value={m.enabled}
                  onValueChange={() => toggleEnabled(m)}
                  trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary }}
                  thumbColor="#FFF"
                />
              </View>
              <Text style={styles.cardDetail}>{m.detail}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(m)}>
                  <Text style={[styles.actionLink, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(m)}>
                  <Text style={[styles.actionLink, { color: '#F87171' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={TYPOGRAPHY.h2}>{editingId ? 'Edit memory' : 'Add a memory'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 12.5 }}>Short label</Text>
            <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Preferred transport" placeholderTextColor={COLORS.textMuted} maxLength={60} />
            <Text style={{ color: COLORS.textMuted, fontSize: 12.5, marginTop: 14 }}>Detail</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={detail}
              onChangeText={setDetail}
              placeholder="Ride-hailing over walking for anything over 2km"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={280}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
