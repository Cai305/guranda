import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLOR: Record<string, string> = {
  VOTING: '#0EA5E9', APPROVED: '#8B5CF6', REJECTED: '#ef4444', RELEASED: '#22c55e',
};

export default function FundingRequestDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    amount: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '700' },
    description: { color: COLORS.textMuted, fontSize: 13 },
    requesterText: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
    voteRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 14 },
    voteStat: { flex: 1, alignItems: 'center' },
    voteCount: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
    voteLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 14 },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    signBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#8B5CF6', borderRadius: 14, padding: 15, alignItems: 'center', justifyContent: 'center' },
    releasedCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#22c55e15', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#22c55e33' },
    releasedTitle: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
    txHash: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: 4 },
    voteRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
    voterName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    hint: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
    errorText: { color: '#ef4444', fontSize: 13 },
  }));
  const { requestId } = route.params;
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/finance/requests/${requestId}`);
      setRequest(res.ok ? await res.json() : null);
    } catch { setRequest(null); }
    setLoading(false);
  }, [requestId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (label: string, action: () => Promise<Response>) => {
    setBusy(true);
    setError('');
    try {
      const res = await action();
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to ${label}`);
      }
      await load();
    } catch (e: any) {
      setError(e.message || `Failed to ${label}`);
    } finally {
      setBusy(false);
    }
  };

  const vote = (choice: 'APPROVE' | 'REJECT') =>
    act('vote', () => fetchApi(`/finance/requests/${requestId}/vote`, { method: 'POST', body: JSON.stringify({ choice }) }));
  const sign = () => act('sign', () => fetchApi(`/finance/requests/${requestId}/sign`, { method: 'POST' }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request</Text>
          <View style={{ width: 30 }} />
        </View>
        <Text style={styles.hint}>Request not found.</Text>
      </SafeAreaView>
    );
  }

  const myVote = request.votes.find((v: any) => v.member.userId === user?.userId);
  const mySignature = request.signatures.find((s: any) => s.member.userId === user?.userId);
  const myMembership = [...request.votes, ...request.signatures].map((x: any) => x.member).find((m: any) => m.userId === user?.userId);
  const iAmCommittee = myMembership ? (myMembership.role === 'COMMITTEE' || myMembership.role === 'ADMIN') : false;
  const approvals = request.votes.filter((v: any) => v.choice === 'APPROVE').length;
  const rejections = request.votes.filter((v: any) => v.choice === 'REJECT').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{request.title}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16, paddingBottom: 60 }}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.amount}>{request.amountXrp} XRP</Text>
            <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[request.status]}22` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[request.status] }]}>{request.status}</Text>
            </View>
          </View>
          {request.description ? <Text style={styles.description}>{request.description}</Text> : null}
          <Text style={styles.requesterText}>Requested by {request.requester?.profile?.displayName || request.requester?.username}</Text>
        </View>

        <View style={styles.voteRow}>
          <View style={styles.voteStat}>
            <Text style={[styles.voteCount, { color: '#22c55e' }]}>{approvals}</Text>
            <Text style={styles.voteLabel}>Approve</Text>
          </View>
          <View style={styles.voteStat}>
            <Text style={[styles.voteCount, { color: '#ef4444' }]}>{rejections}</Text>
            <Text style={styles.voteLabel}>Reject</Text>
          </View>
          <View style={styles.voteStat}>
            <Text style={styles.voteCount}>{request.signatures.length}/{request.stokvel.signerQuorum}</Text>
            <Text style={styles.voteLabel}>Signed</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {request.status === 'VOTING' && !myVote && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => vote('APPROVE')} disabled={busy}>
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => vote('REJECT')} disabled={busy}>
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        {request.status === 'VOTING' && myVote && (
          <Text style={styles.hint}>You voted {myVote.choice.toLowerCase()}. Waiting on the rest of the stokvel.</Text>
        )}

        {request.status === 'APPROVED' && iAmCommittee && !mySignature && (
          <TouchableOpacity style={styles.signBtn} onPress={sign} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="key" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Sign committee release ({request.signatures.length}/{request.stokvel.signerQuorum})</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {request.status === 'APPROVED' && iAmCommittee && mySignature && (
          <Text style={styles.hint}>You've signed. Waiting on {request.stokvel.signerQuorum - request.signatures.length} more committee signature(s).</Text>
        )}
        {request.status === 'APPROVED' && !iAmCommittee && (
          <Text style={styles.hint}>Approved — awaiting {request.stokvel.signerQuorum} committee signatures to release funds on XRPL.</Text>
        )}

        {request.status === 'RELEASED' && (
          <View style={styles.releasedCard}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.releasedTitle}>Released on XRPL</Text>
              <Text style={styles.txHash} numberOfLines={1}>{request.xrplTxHash}</Text>
            </View>
          </View>
        )}
        {request.status === 'REJECTED' && (
          <Text style={styles.hint}>This request did not reach the {request.stokvel.votingThresholdPct}% approval threshold.</Text>
        )}

        <Text style={styles.sectionLabel}>VOTES</Text>
        {request.votes.map((v: any) => (
          <View key={v.id} style={styles.voteRowItem}>
            <Text style={styles.voterName}>{v.member.user?.profile?.displayName || v.member.user?.username}</Text>
            <Text style={{ color: v.choice === 'APPROVE' ? '#22c55e' : '#ef4444', fontWeight: '700', fontSize: 12 }}>{v.choice}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
