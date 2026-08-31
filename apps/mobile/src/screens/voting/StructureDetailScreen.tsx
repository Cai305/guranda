import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const STATUS_COLOR: Record<string, string> = { SCHEDULED: '#9494AB', OPEN: '#34D399', CLOSED: '#5B5B6B' };

export default function StructureDetailScreen({ route, navigation }: any) {
  const { structureId } = route.params;
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    addBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
    memberName: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
    memberSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${COLORS.primary}22` },
    rolePillText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
    electionTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    electionSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 13, flex: 1 },
    inlineForm: { flexDirection: 'row', gap: 8, marginTop: 4 },
    inlineBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
    inlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
    errorText: { color: COLORS.error, fontSize: 12 },
  }));

  const [structure, setStructure] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [votingWeight, setVotingWeight] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/voting/structures/${structureId}`, { headers: { 'Cache-Control': 'no-cache' } });
      setStructure(res.ok ? await res.json() : null);
    } catch { setStructure(null); }
    setLoading(false);
  }, [structureId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addMember = async () => {
    if (!username.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetchApi(`/voting/structures/${structureId}/members`, {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), votingWeight: parseInt(votingWeight, 10) || 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add member');
      }
      setUsername('');
      setVotingWeight('1');
      await load();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }
  if (!structure) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Structure</Text>
          <View style={{ width: 30 }} />
        </View>
        <Text style={styles.hint}>Structure not found.</Text>
      </SafeAreaView>
    );
  }

  const isAdmin = structure.myRole === 'ADMIN';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{structure.name}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 24, paddingBottom: 60 }}>
        <View style={{ gap: 10 }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>ELECTIONS</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateElection', { structureId })}>
                <Ionicons name="add" size={14} color={COLORS.primary} />
                <Text style={styles.addBtnText}>New election</Text>
              </TouchableOpacity>
            )}
          </View>
          {structure.elections.length === 0 ? (
            <Text style={styles.hint}>No elections yet.</Text>
          ) : (
            structure.elections.map((e: any) => (
              <TouchableOpacity key={e.id} style={styles.card} onPress={() => navigation.navigate('ElectionDetail', { electionId: e.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.electionTitle}>{e.title}</Text>
                  <Text style={styles.electionSub}>Opened {new Date(e.opensAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[e.status]}22` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[e.status] }]}>{e.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={styles.sectionLabel}>VOTER ROLL ({structure.members.length})</Text>
          {structure.members.map((m: any) => (
            <View key={m.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.user?.profile?.displayName || m.user?.username}</Text>
                <Text style={styles.memberSub}>Voting weight: {m.votingWeight}</Text>
              </View>
              <View style={styles.rolePill}><Text style={styles.rolePillText}>{m.role}</Text></View>
            </View>
          ))}

          {isAdmin && (
            <View style={{ gap: 8 }}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.inlineForm}>
                <TextInput style={styles.input} placeholder="Username to add" placeholderTextColor={COLORS.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" />
                <TextInput style={[styles.input, { flex: 0, width: 60 }]} placeholder="1" placeholderTextColor={COLORS.textMuted} value={votingWeight} onChangeText={setVotingWeight} keyboardType="number-pad" />
                <TouchableOpacity style={styles.inlineBtn} onPress={addMember} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.inlineBtnText}>Add</Text>}
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Voting weight only matters for weighted/share-based ballots — leave it at 1 otherwise.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
