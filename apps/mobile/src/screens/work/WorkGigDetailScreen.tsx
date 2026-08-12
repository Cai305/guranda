import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open for proposals',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted — awaiting approval',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function WorkGigDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const { gigId } = route.params;
  const { user } = useAuth();
  const [gig, setGig] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [message, setMessage] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [proposed, setProposed] = useState(false);

  const isClient = gig && user && gig.clientId === user.userId;
  const isFreelancer = gig && user && gig.freelancerId === user.userId;

  const load = useCallback(async () => {
    try {
      const g = await fetchApi(`/work/gigs/${gigId}`).then(r => r.json());
      setGig(g);
      if (user && g.clientId === user.userId) {
        const props = await fetchApi(`/work/gigs/${gigId}/proposals`).then(r => r.json()).catch(() => []);
        setProposals(Array.isArray(props) ? props : []);
      }
    } catch {}
    setLoading(false);
  }, [gigId, user]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<Response>, onDone?: () => void) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await fn();
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Something went wrong');
      }
      onDone?.();
      await load();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const submitProposal = () => run(
    () => fetchApi(`/work/gigs/${gigId}/propose`, { method: 'POST', body: JSON.stringify({ message: message.trim(), proposedBudget: Number(proposedBudget) }) }),
    () => setProposed(true),
  );

  const acceptProposal = (proposalId: string) => run(
    () => fetchApi(`/work/proposals/${proposalId}/accept`, { method: 'POST' }),
    () => setSuccess('Proposal accepted — funds are now held for this gig.'),
  );

  const submitWork = () => run(
    () => fetchApi(`/work/gigs/${gigId}/submit`, { method: 'POST' }),
    () => setSuccess('Work submitted — waiting for client approval.'),
  );

  const approveCompletion = () => run(
    () => fetchApi(`/work/gigs/${gigId}/approve`, { method: 'POST' }),
    () => setSuccess('Payment released to the freelancer!'),
  );

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    title: { ...TYPOGRAPHY.h2, marginBottom: 6 },
    clientText: { color: COLORS.textMuted, fontSize: 12, marginBottom: 14 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    statusBadge: { backgroundColor: '#8B5CF615', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    statusText: { color: '#8B5CF6', fontSize: 12, fontWeight: '700' },
    budget: { color: '#8B5CF6', fontWeight: '800', fontSize: 18 },
    section: { marginBottom: 20 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: 10 },
    desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
    hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
    errorText: { color: '#ef4444', fontSize: 13, marginBottom: 12 },
    successText: { color: '#22c55e', fontSize: 13, fontWeight: '600', marginBottom: 12 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 14 },
    actionBtn: { backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    proposalCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12,
      padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12,
    },
    proposalName: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
    proposalBudget: { color: '#8B5CF6', fontWeight: '700', fontSize: 14, marginTop: 4 },
    proposalStatus: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
    acceptBtn: { backgroundColor: '#8B5CF6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!gig) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Gig not found</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Gig details</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        <Text style={styles.title}>{gig.title}</Text>
        <Text style={styles.clientText}>Posted by {gig.client?.profile?.displayName || gig.client?.username}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{STATUS_LABEL[gig.status] || gig.status}</Text>
          </View>
          <Text style={styles.budget}>{formatCurrency(gig.budget)} budget</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.desc}>{gig.description}</Text>
        </View>

        {success ? <Text style={styles.successText}>{success}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Freelancer browsing — propose */}
        {!isClient && !isFreelancer && gig.status === 'OPEN' && !proposed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submit a proposal</Text>
            <TextInput style={styles.input} placeholder="Your proposed budget (R)" placeholderTextColor={COLORS.textMuted} value={proposedBudget} onChangeText={setProposedBudget} keyboardType="decimal-pad" />
            <TextInput style={[styles.input, { minHeight: 80, marginTop: 8 }]} placeholder="Message (optional)" placeholderTextColor={COLORS.textMuted} value={message} onChangeText={setMessage} multiline />
            <TouchableOpacity style={styles.actionBtn} disabled={busy || !proposedBudget.trim()} onPress={submitProposal}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Send Proposal</Text>}
            </TouchableOpacity>
          </View>
        )}
        {proposed && (
          <View style={styles.section}>
            <Text style={styles.hint}>Your proposal has been sent — check "My Proposals" for updates.</Text>
          </View>
        )}

        {/* Client view — proposals list */}
        {isClient && gig.status === 'OPEN' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROPOSALS ({proposals.length})</Text>
            {proposals.length === 0 ? (
              <Text style={styles.hint}>No proposals yet.</Text>
            ) : (
              proposals.map(p => (
                <View key={p.id} style={styles.proposalCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proposalName}>{p.freelancer?.profile?.displayName || p.freelancer?.username}</Text>
                    {p.message && <Text style={styles.hint}>{p.message}</Text>}
                    <Text style={styles.proposalBudget}>{formatCurrency(p.proposedBudget)}</Text>
                  </View>
                  {p.status === 'PENDING' ? (
                    <TouchableOpacity style={styles.acceptBtn} disabled={busy} onPress={() => acceptProposal(p.id)}>
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.proposalStatus}>{p.status}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Freelancer assigned — submit work */}
        {isFreelancer && gig.status === 'IN_PROGRESS' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={submitWork}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Mark Work as Submitted</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Client — approve completion */}
        {isClient && gig.status === 'SUBMITTED' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={approveCompletion}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Approve & Release {formatCurrency(gig.escrowAmount)}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {gig.status === 'COMPLETED' && (
          <View style={styles.section}>
            <Text style={styles.hint}>This gig is complete — {formatCurrency(gig.escrowAmount)} was paid to the freelancer.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
