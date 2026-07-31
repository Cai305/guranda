import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

const STATUS_COLOR: Record<string, string> = {
  VOTING: '#0EA5E9', APPROVED: '#8B5CF6', REJECTED: '#ef4444', RELEASED: '#22c55e',
};

export default function StokvelDetailScreen({ route, navigation }: any) {
  const { stokvelId } = route.params;
  const [stokvel, setStokvel] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/finance/stokvels/${stokvelId}`);
      if (!res.ok) { setStokvel(null); setLoading(false); return; }
      const data = await res.json();
      setStokvel(data);
      if (data.myRole) {
        const [reportRes, requestsRes] = await Promise.all([
          fetchApi(`/finance/stokvels/${stokvelId}/report`),
          fetchApi(`/finance/stokvels/${stokvelId}/requests`),
        ]);
        setReport(await reportRes.json().catch(() => null));
        setRequests(await requestsRes.json().catch(() => []));
      } else {
        setReport(null);
        setRequests([]);
      }
    } catch { setStokvel(null); }
    setLoading(false);
  }, [stokvelId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runAction = async (label: string, action: () => Promise<Response>) => {
    setBusy(true);
    setBanner('');
    try {
      const res = await action();
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to ${label}`);
      }
      await load();
    } catch (e: any) {
      setBanner(e.message || `Failed to ${label}`);
    } finally {
      setBusy(false);
    }
  };

  const join = () => runAction('join', () => fetchApi(`/finance/stokvels/${stokvelId}/join`, { method: 'POST' }));
  const contribute = () => runAction('contribute', () => fetchApi(`/finance/stokvels/${stokvelId}/contribute`, { method: 'POST', body: JSON.stringify({}) }));
  const promote = (memberId: string) => runAction('promote member', () => fetchApi(`/finance/stokvels/${stokvelId}/members/${memberId}/promote`, { method: 'POST' }));
  const activateMultisig = () => runAction('activate multisig', () => fetchApi(`/finance/stokvels/${stokvelId}/activate-multisig`, { method: 'POST' }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!stokvel) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stokvel</Text>
          <View style={{ width: 30 }} />
        </View>
        <Text style={styles.hint}>Stokvel not found.</Text>
      </SafeAreaView>
    );
  }

  const committeeCount = stokvel.committeeCount ?? 0;
  const canActivate = stokvel.myRole === 'ADMIN' && !stokvel.multisigActive && committeeCount >= stokvel.signerQuorum;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{stokvel.name}</Text>
          <Text style={styles.headerSub}>{stokvel.category}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('StokvelAuditLog', { stokvelId })}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16, paddingBottom: 60 }}>
        <View style={styles.walletCard}>
          <View style={styles.walletTopRow}>
            <Text style={styles.walletLabel}>STOKVEL WALLET</Text>
            <View style={[styles.multisigPill, { backgroundColor: stokvel.multisigActive ? '#22c55e22' : '#f59e0b22' }]}>
              <Ionicons name={stokvel.multisigActive ? 'lock-closed' : 'lock-open'} size={11} color={stokvel.multisigActive ? '#22c55e' : '#f59e0b'} />
              <Text style={[styles.multisigPillText, { color: stokvel.multisigActive ? '#22c55e' : '#f59e0b' }]}>
                {stokvel.multisigActive ? 'Multisig active' : 'Multisig not active'}
              </Text>
            </View>
          </View>
          <Text style={styles.walletBalance}>{stokvel.balanceXrp?.toFixed(4) ?? '0'} <Text style={styles.walletUnit}>XRP</Text></Text>
          <Text style={styles.walletAddress} numberOfLines={1}>{stokvel.xrplAddress}</Text>
          {stokvel.description ? <Text style={styles.description}>{stokvel.description}</Text> : null}
        </View>

        {banner ? <Text style={styles.errorText}>{banner}</Text> : null}

        {!stokvel.myRole ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={join} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Join this stokvel</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={contribute} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Contribute {stokvel.contributionAmount} XRP</Text>}
          </TouchableOpacity>
        )}

        {report && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Text style={styles.statValue}>{report.memberCount}</Text><Text style={styles.statLabel}>Members</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{report.totalContributed.toFixed(1)}</Text><Text style={styles.statLabel}>Contributed (XRP)</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{report.totalReleased.toFixed(1)}</Text><Text style={styles.statLabel}>Released (XRP)</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{report.pendingRequests}</Text><Text style={styles.statLabel}>Pending requests</Text></View>
          </View>
        )}

        {canActivate && (
          <TouchableOpacity style={styles.multisigBtn} onPress={activateMultisig} disabled={busy}>
            <Ionicons name="key" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Activate multisig ({committeeCount}/{stokvel.signerQuorum} committee signers)</Text>
          </TouchableOpacity>
        )}

        {stokvel.myRole && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>FUNDING REQUESTS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreateFundingRequest', { stokvelId })}>
                <Text style={styles.sectionAction}>+ New request</Text>
              </TouchableOpacity>
            </View>
            {requests.length === 0 ? (
              <Text style={styles.hint}>No funding requests yet.</Text>
            ) : (
              requests.map(r => (
                <TouchableOpacity key={r.id} style={styles.requestCard} onPress={() => navigation.navigate('FundingRequestDetail', { requestId: r.id })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={styles.requestMeta}>{r.votes?.length ?? 0} vote{(r.votes?.length ?? 0) === 1 ? '' : 's'} · {r.signatures?.length ?? 0}/{stokvel.signerQuorum} signed</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.requestAmount}>{r.amountXrp} XRP</Text>
                    <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[r.status]}22` }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{r.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>MEMBERS</Text>
        </View>
        {stokvel.members.map((m: any) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.user?.profile?.displayName || m.user?.username}</Text>
              <Text style={styles.memberRole}>{m.role}</Text>
            </View>
            {stokvel.myRole === 'ADMIN' && m.role === 'MEMBER' && (
              <TouchableOpacity style={styles.promoteBtn} onPress={() => promote(m.id)} disabled={busy}>
                <Text style={styles.promoteBtnText}>Promote</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 4 },
  back: { padding: 4, marginRight: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { ...TYPOGRAPHY.h2 },
  headerSub: { color: COLORS.textMuted, fontSize: 12 },
  iconBtn: { padding: 6 },
  walletCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  walletTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  multisigPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  multisigPillText: { fontSize: 10, fontWeight: '700' },
  walletBalance: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  walletUnit: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  walletAddress: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'monospace' },
  description: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  primaryBtn: { backgroundColor: '#F59E0B', borderRadius: 14, padding: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  multisigBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#8B5CF6', borderRadius: 14, padding: 15, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  statValue: { color: '#F59E0B', fontSize: 20, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
  sectionAction: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  requestCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  requestTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  requestMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  requestAmount: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  memberName: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  memberRole: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  promoteBtn: { backgroundColor: COLORS.surfaceElevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  promoteBtnText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  hint: { color: COLORS.textMuted, fontSize: 13 },
  errorText: { color: '#ef4444', fontSize: 13 },
});
