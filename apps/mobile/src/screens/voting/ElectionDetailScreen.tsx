import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

const VOTING_TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: 'Single choice',
  RANKED_CHOICE: 'Ranked choice',
  MULTI_SELECT: 'Multi-select',
  WEIGHTED: 'Weighted',
};
const VOTING_TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  SINGLE_CHOICE: 'checkmark-circle',
  RANKED_CHOICE: 'swap-vertical',
  MULTI_SELECT: 'people',
  WEIGHTED: 'stats-chart',
};

export default function ElectionDetailScreen({ route, navigation }: any) {
  const { electionId } = route.params;
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    switcherRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg, paddingBottom: 12 },
    switchChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    switchChipActive: { backgroundColor: `${COLORS.primary}22`, borderColor: COLORS.primary },
    switchText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
    switchTextActive: { color: COLORS.primary },
    electionCard: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 18, backgroundColor: `${COLORS.primary}18`, borderWidth: 1, borderColor: `${COLORS.primary}44`, gap: 6, marginBottom: 16 },
    electionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
    electionSub: { color: COLORS.textMuted, fontSize: 12 },
    statRow: { flexDirection: 'row', gap: 18, marginTop: 8 },
    statValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    statLabel: { color: COLORS.textMuted, fontSize: 10 },
    statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: `${COLORS.success}22` },
    statusText: { fontSize: 10, fontWeight: '700', color: COLORS.success },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, marginBottom: 10 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    addBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
    posCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
    posIconWrap: { width: 34, height: 34, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
    posTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
    posSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
    hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, paddingHorizontal: SPACING.lg },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    cta: { backgroundColor: COLORS.primary, borderRadius: 999, padding: 16, alignItems: 'center' },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    doneBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
    doneText: { color: COLORS.success, fontWeight: '700', fontSize: 13 },
  }));

  const [election, setElection] = useState<any>(null);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [electionRes, structuresRes] = await Promise.all([
        fetchApi(`/voting/elections/${electionId}`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetchApi('/voting/structures/mine', { headers: { 'Cache-Control': 'no-cache' } }),
      ]);
      setElection(electionRes.ok ? await electionRes.json() : null);
      const s = await structuresRes.json();
      setStructures(Array.isArray(s) ? s : []);
    } catch {
      setElection(null);
    }
    setLoading(false);
  }, [electionId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <SafeAreaView style={styles.container} edges={['top']}><ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} /></SafeAreaView>;
  }
  if (!election) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Election</Text>
          <View style={{ width: 30 }} />
        </View>
        <Text style={styles.hint}>Election not found.</Text>
      </SafeAreaView>
    );
  }

  const isAdmin = election.myRole === 'ADMIN';
  const votedCount = election.positions.filter((p: any) => p.myVoted).length;
  const nextPosition = election.positions.find((p: any) => !p.myVoted);
  const allDone = election.positions.length > 0 && !nextPosition;

  const onPressCta = () => {
    if (!election.myCheckedIn) {
      navigation.navigate('VoterRoll', { electionId });
    } else if (nextPosition) {
      navigation.navigate('CastVote', { positionId: nextPosition.id, electionId });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{election.title}</Text>
        <View style={{ width: 30 }} />
      </View>

      {structures.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherRow}>
          {structures.map((s: any) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.switchChip, s.id === election.structureId && styles.switchChipActive]}
              onPress={() => navigation.navigate('StructureDetail', { structureId: s.id })}
            >
              <Text style={[styles.switchText, s.id === election.structureId && styles.switchTextActive]}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.electionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.electionTitle}>{election.title}</Text>
            <View style={styles.statusPill}><Text style={styles.statusText}>{election.status}</Text></View>
          </View>
          <Text style={styles.electionSub}>{election.structure?.name}</Text>
          <View style={styles.statRow}>
            <View><Text style={styles.statValue}>{election.positions.length}</Text><Text style={styles.statLabel}>ballots</Text></View>
            <View><Text style={styles.statValue}>{votedCount}</Text><Text style={styles.statLabel}>completed</Text></View>
            {election.myVotingWeight > 1 && (
              <View><Text style={styles.statValue}>{election.myVotingWeight}</Text><Text style={styles.statLabel}>your weight</Text></View>
            )}
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>SIMULTANEOUS BALLOTS</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddPosition', { electionId })}>
              <Ionicons name="add" size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add position</Text>
            </TouchableOpacity>
          )}
        </View>

        {election.positions.length === 0 ? (
          <Text style={styles.hint}>No positions yet.{isAdmin ? ' Add one to get this election started.' : ''}</Text>
        ) : (
          <View style={{ paddingHorizontal: SPACING.lg, gap: 9 }}>
            {election.positions.map((p: any) => (
              <TouchableOpacity
                key={p.id}
                style={styles.posCard}
                activeOpacity={0.85}
                onPress={() => election.myCheckedIn && !p.myVoted && navigation.navigate('CastVote', { positionId: p.id, electionId })}
              >
                <View style={[styles.posIconWrap, { backgroundColor: p.myVoted ? `${COLORS.success}22` : `${COLORS.primary}22` }]}>
                  <Ionicons name={p.myVoted ? 'checkmark' : VOTING_TYPE_ICON[p.votingType]} size={16} color={p.myVoted ? COLORS.success : COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.posTitle}>{p.title}</Text>
                  <Text style={styles.posSub}>
                    {VOTING_TYPE_LABEL[p.votingType]} · {p.seats} seat{p.seats === 1 ? '' : 's'} · {p.myVoted ? 'voted' : 'not yet voted'}
                  </Text>
                </View>
                {!p.myVoted && <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {election.positions.length > 0 && (
        <View style={styles.footer}>
          {allDone ? (
            <View style={styles.doneBanner}>
              <Ionicons name="checkmark-done-circle" size={18} color={COLORS.success} />
              <Text style={styles.doneText}>All ballots complete — thank you for voting</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.cta} onPress={onPressCta}>
              <Text style={styles.ctaText}>
                {!election.myCheckedIn ? 'Verify voter roll & check in' : `Continue voting — ${nextPosition?.title}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
