import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const VOTING_TYPES: { id: string; label: string; hint: string }[] = [
  { id: 'SINGLE_CHOICE', label: 'Single choice', hint: 'Mark one box — the classic ballot' },
  { id: 'RANKED_CHOICE', label: 'Ranked choice', hint: 'Rank candidates in order of preference' },
  { id: 'MULTI_SELECT', label: 'Multi-select', hint: 'Pick up to N candidates for N seats' },
  { id: 'WEIGHTED', label: 'Weighted', hint: 'Allocate voting power across candidates' },
];

export default function AddPositionScreen({ route, navigation }: any) {
  const { electionId } = route.params;
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    typeCard: { padding: 14, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
    typeCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}14` },
    typeLabel: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    typeHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    errorText: { color: COLORS.error, fontSize: 13 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
    candidateName: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
    inlineForm: { flexDirection: 'row', gap: 8 },
    inlineBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
    inlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  }));

  const [title, setTitle] = useState('');
  const [votingType, setVotingType] = useState('SINGLE_CHOICE');
  const [seats, setSeats] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<any>(null);

  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateName, setCandidateName] = useState('');
  const [slateName, setSlateName] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);

  const createPosition = async () => {
    if (!title.trim()) { setError('A title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi(`/voting/elections/${electionId}/positions`, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), votingType, seats: parseInt(seats, 10) || 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create position');
      }
      setPosition(await res.json());
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const addCandidate = async () => {
    if (!candidateName.trim() || !position) return;
    setAddingCandidate(true);
    try {
      const res = await fetchApi(`/voting/positions/${position.id}/candidates`, {
        method: 'POST',
        body: JSON.stringify({ name: candidateName.trim(), slateName: slateName.trim() || undefined }),
      });
      if (res.ok) {
        const candidate = await res.json();
        setCandidates((c) => [...c, candidate]);
        setCandidateName('');
        setSlateName('');
      }
    } finally {
      setAddingCandidate(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{position ? position.title : 'Add a position'}</Text>
        <View style={{ width: 30 }} />
      </View>

      {!position ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
            <View>
              <Text style={styles.label}>Position title *</Text>
              <TextInput style={styles.input} placeholder="e.g. Chairperson" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
            </View>
            <View>
              <Text style={styles.label}>Voting mechanic</Text>
              {VOTING_TYPES.map((t) => (
                <TouchableOpacity key={t.id} style={[styles.typeCard, votingType === t.id && styles.typeCardActive]} onPress={() => setVotingType(t.id)}>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                  <Text style={styles.typeHint}>{t.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View>
              <Text style={styles.label}>Seats</Text>
              <TextInput style={styles.input} value={seats} onChangeText={setSeats} keyboardType="number-pad" />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={createPosition} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create position</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16, paddingBottom: 100 }}>
            <Text style={styles.hint}>Add every candidate (or slate) that will appear on this ballot.</Text>
            {candidates.map((c) => (
              <View key={c.id} style={styles.candidateRow}>
                <Text style={styles.candidateName}>{c.name}</Text>
                {c.slateName ? <Text style={styles.hint}>{c.slateName}</Text> : null}
              </View>
            ))}
            <View style={{ gap: 8 }}>
              <TextInput style={styles.input} placeholder="Candidate name" placeholderTextColor={COLORS.textMuted} value={candidateName} onChangeText={setCandidateName} />
              <TextInput style={styles.input} placeholder="Slate (optional)" placeholderTextColor={COLORS.textMuted} value={slateName} onChangeText={setSlateName} />
              <TouchableOpacity style={[styles.inlineBtn, { alignSelf: 'flex-start', paddingVertical: 12 }]} onPress={addCandidate} disabled={addingCandidate}>
                {addingCandidate ? <ActivityIndicator color="#fff" /> : <Text style={styles.inlineBtnText}>Add candidate</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()} disabled={candidates.length === 0}>
              <Text style={styles.saveBtnText}>{candidates.length === 0 ? 'Add at least one candidate' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
