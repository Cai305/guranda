import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { useBiometricGate } from '../../hooks/useBiometricGate';

export default function CastVoteScreen({ route, navigation }: any) {
  const { positionId, electionId } = route.params;
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const runBiometricGate = useBiometricGate();
  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
    headerSub: { color: COLORS.textMuted, fontSize: 10.5, textAlign: 'center' },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACING.lg, padding: 11, borderRadius: 12, backgroundColor: `${COLORS.primary}14`, borderWidth: 1, borderColor: `${COLORS.primary}33`, marginBottom: 10 },
    bannerText: { color: COLORS.text, fontSize: 11.5, flex: 1 },
    weightCard: { marginHorizontal: SPACING.lg, marginBottom: 12, padding: 13, borderRadius: 14, backgroundColor: `${COLORS.secondary}14`, borderWidth: 1, borderColor: `${COLORS.secondary}33`, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    weightLabel: { color: COLORS.textMuted, fontSize: 10.5, textTransform: 'uppercase' },
    weightValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 13 },
    cardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0F` },
    avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: `${COLORS.primary}33` },
    candidateName: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
    candidateSlate: { color: COLORS.textMuted, fontSize: 10.5, textTransform: 'uppercase' },
    checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border },
    checkboxOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    rankBadge: { width: 26, height: 26, borderRadius: 999, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    rankBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    rankPlaceholder: { width: 26, height: 26, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    stepValue: { color: COLORS.text, fontWeight: '700', fontSize: 14, minWidth: 28, textAlign: 'center' },
    errorText: { color: COLORS.error, fontSize: 13, marginHorizontal: SPACING.lg },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
    cta: { backgroundColor: COLORS.primary, borderRadius: 999, padding: 16, alignItems: 'center' },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    hint: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  }));

  const [election, setElection] = useState<any>(null);
  const [position, setPosition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [singleChoice, setSingleChoice] = useState<string | null>(null);
  const [multiChoice, setMultiChoice] = useState<string[]>([]);
  const [ranking, setRanking] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/voting/elections/${electionId}`, { headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      setElection(data);
      setPosition(data.positions.find((p: any) => p.id === positionId) || null);
    } catch {
      setElection(null);
    }
    setLoading(false);
  }, [electionId, positionId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !election || !position) {
    return <SafeAreaView style={styles.container} edges={['top']}><ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  const votingWeight = election.myVotingWeight || 1;
  const allocatedTotal = Object.values(allocations).reduce((s, n) => s + (n || 0), 0);

  const toggleMulti = (id: string) => {
    setMultiChoice((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= position.seats) return prev;
      return [...prev, id];
    });
  };

  const toggleRank = (id: string) => {
    setRanking((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const adjustAllocation = (id: string, delta: number) => {
    setAllocations((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      if (delta > 0 && allocatedTotal >= votingWeight) return prev;
      return { ...prev, [id]: next };
    });
  };

  const buildSelection = (): Record<string, any> | null => {
    switch (position.votingType) {
      case 'SINGLE_CHOICE':
        return singleChoice ? { candidateId: singleChoice } : null;
      case 'MULTI_SELECT':
        return multiChoice.length > 0 ? { candidateIds: multiChoice } : null;
      case 'RANKED_CHOICE':
        return ranking.length > 0 ? { rankedCandidateIds: ranking } : null;
      case 'WEIGHTED': {
        const entries = Object.entries(allocations).filter(([, v]) => v > 0);
        return entries.length > 0 ? { allocations: Object.fromEntries(entries) } : null;
      }
      default:
        return null;
    }
  };

  const selection = buildSelection();

  const submit = async () => {
    if (!selection) return;
    setError('');
    setSubmitting(true);
    const bio = await runBiometricGate();
    if (!bio.ok) {
      setSubmitting(false);
      setError(bio.reason || 'Biometric verification failed — vote not submitted');
      return;
    }
    try {
      const res = await fetchApi(`/voting/positions/${positionId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ selection }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit vote');
      }
      const vote = await res.json();
      navigation.replace('VoteReceipt', { electionId, positionTitle: position.title, vote });
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{position.title}</Text>
          <Text style={styles.headerSub}>{election.structure?.name}</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {position.votingType === 'SINGLE_CHOICE' && (
        <View style={styles.banner}><Ionicons name="information-circle" size={16} color={COLORS.primary} /><Text style={styles.bannerText}>Single choice — mark one box only, as on an official ballot paper</Text></View>
      )}
      {position.votingType === 'RANKED_CHOICE' && (
        <View style={styles.banner}><Ionicons name="swap-vertical" size={16} color={COLORS.primary} /><Text style={styles.bannerText}>Ranked choice — tap candidates in the order you prefer them</Text></View>
      )}
      {position.votingType === 'MULTI_SELECT' && (
        <View style={styles.banner}><Ionicons name="people" size={16} color={COLORS.primary} /><Text style={styles.bannerText}>Multi-select — {position.seats} seat{position.seats === 1 ? '' : 's'} open, choose up to {position.seats}</Text></View>
      )}
      {position.votingType === 'WEIGHTED' && (
        <View style={styles.weightCard}>
          <View><Text style={styles.weightLabel}>Your voting power</Text><Text style={styles.weightValue}>{votingWeight} shares</Text></View>
          <View><Text style={styles.weightLabel}>Allocated</Text><Text style={styles.weightValue}>{allocatedTotal} / {votingWeight}</Text></View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 9, paddingBottom: 140 }}>
        {position.candidates.map((c: any) => {
          if (position.votingType === 'SINGLE_CHOICE') {
            const selected = singleChoice === c.id;
            return (
              <TouchableOpacity key={c.id} style={[styles.card, selected && styles.cardSelected]} onPress={() => setSingleChoice(c.id)}>
                <View style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  {c.slateName ? <Text style={styles.candidateSlate}>{c.slateName}</Text> : null}
                  <Text style={styles.candidateName}>{c.name}</Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                  {selected && <Ionicons name="checkmark" size={16} color="#fff" style={{ alignSelf: 'center' }} />}
                </View>
              </TouchableOpacity>
            );
          }
          if (position.votingType === 'MULTI_SELECT') {
            const selected = multiChoice.includes(c.id);
            return (
              <TouchableOpacity key={c.id} style={[styles.card, selected && styles.cardSelected]} onPress={() => toggleMulti(c.id)}>
                <View style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  {c.slateName ? <Text style={styles.candidateSlate}>{c.slateName}</Text> : null}
                  <Text style={styles.candidateName}>{c.name}</Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                  {selected && <Ionicons name="checkmark" size={16} color="#fff" style={{ alignSelf: 'center' }} />}
                </View>
              </TouchableOpacity>
            );
          }
          if (position.votingType === 'RANKED_CHOICE') {
            const rank = ranking.indexOf(c.id);
            return (
              <TouchableOpacity key={c.id} style={[styles.card, rank >= 0 && styles.cardSelected]} onPress={() => toggleRank(c.id)}>
                {rank >= 0 ? (
                  <View style={styles.rankBadge}><Text style={styles.rankBadgeText}>{rank + 1}</Text></View>
                ) : (
                  <View style={styles.rankPlaceholder} />
                )}
                <View style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  {c.slateName ? <Text style={styles.candidateSlate}>{c.slateName}</Text> : null}
                  <Text style={styles.candidateName}>{c.name}</Text>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{rank >= 0 ? 'Tap to remove' : 'Tap to rank'}</Text>
              </TouchableOpacity>
            );
          }
          // WEIGHTED
          const amount = allocations[c.id] || 0;
          return (
            <View key={c.id} style={[styles.card, amount > 0 && styles.cardSelected]}>
              <View style={styles.avatar} />
              <View style={{ flex: 1 }}>
                {c.slateName ? <Text style={styles.candidateSlate}>{c.slateName}</Text> : null}
                <Text style={styles.candidateName}>{c.name}</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAllocation(c.id, -1)}><Ionicons name="remove" size={16} color={COLORS.text} /></TouchableOpacity>
                <Text style={styles.stepValue}>{amount}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAllocation(c.id, 1)}><Ionicons name="add" size={16} color={COLORS.text} /></TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.cta, !selection && styles.ctaDisabled]} onPress={submit} disabled={!selection || submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Confirm & continue</Text>}
        </TouchableOpacity>
        <Text style={styles.hint}>One more biometric check confirms it's really you before this is recorded on XRPL</Text>
      </View>
    </SafeAreaView>
  );
}
