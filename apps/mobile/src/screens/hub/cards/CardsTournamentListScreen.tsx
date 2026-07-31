import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../../theme';
import { fetchApi } from '../../../utils/api';

export default function CardsTournamentListScreen({ navigation }: any) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [mode, setMode] = useState<'FIVE_CARDS' | 'CASSINO'>('FIVE_CARDS');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchApi('/cards-tournaments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setTournaments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createTournament = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetchApi('/cards-tournaments', {
        method: 'POST',
        body: JSON.stringify({ mode, name: name.trim(), maxPlayers: Number(maxPlayers) || 8 }),
      });
      if (!res.ok) throw new Error('Failed to create tournament');
      setShowCreate(false);
      setName('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Tournaments</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tournaments}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CardsTournamentBracket', { tournamentId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.mode === 'FIVE_CARDS' ? '5 Cards' : 'Cassino'} · {item.entries?.length ?? 0}/{item.maxPlayers} players
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No open tournaments — create one!</Text>}
          </View>
        }
      />

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={TYPOGRAPHY.h3}>New Tournament</Text>
            <TextInput style={styles.input} placeholder="Tournament name" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
            <View style={styles.modeRow}>
              <TouchableOpacity style={[styles.modeChip, mode === 'FIVE_CARDS' && styles.modeChipActive]} onPress={() => setMode('FIVE_CARDS')}>
                <Text style={styles.modeChipText}>5 Cards</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeChip, mode === 'CASSINO' && styles.modeChipActive]} onPress={() => setMode('CASSINO')}>
                <Text style={styles.modeChipText}>Cassino</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Max players (e.g. 8)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={maxPlayers}
              onChangeText={setMaxPlayers}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={createTournament} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
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
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  name: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm },
  input: {
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, color: COLORS.text,
  },
  modeRow: { flexDirection: 'row', gap: SPACING.sm },
  modeChip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.glass, alignItems: 'center', borderWidth: 1, borderColor: COLORS.glassBorder },
  modeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeChipText: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.pill, alignItems: 'center', backgroundColor: COLORS.glass },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '700' },
  createBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.pill, alignItems: 'center', backgroundColor: COLORS.primary },
  createBtnText: { color: '#fff', fontWeight: '800' },
});
