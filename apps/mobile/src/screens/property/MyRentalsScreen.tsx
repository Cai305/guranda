import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

// Tenant dashboard: your rentals — pay rent from the Guranda wallet (auto
// receipt), see payment history, report issues to your agent, view lease.

export default function MyRentalsScreen({ navigation }: any) {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#07211E' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40, lineHeight: 20 },
    card: {
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
    },
    title: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
    address: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
    agent: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 4 },
    rentRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginTop: 12,
      backgroundColor: 'rgba(45,212,191,0.06)',
      borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)',
      borderRadius: RADIUS.md,
      padding: 12,
    },
    rentAmount: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
    rentStatus: { fontSize: 12, marginTop: 3, fontWeight: '600' },
    payBtn: {
      flexDirection: 'row', gap: 6, alignItems: 'center',
      backgroundColor: '#0D9488',
      borderRadius: RADIUS.pill,
      paddingVertical: 10, paddingHorizontal: 16,
    },
    payText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    section: { marginTop: 10 },
    subLabel: { color: COLORS.textMuted, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
    receiptRow: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    actionBtn: {
      flexDirection: 'row', gap: 6, alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 7, paddingHorizontal: 14,
    },
    actionText: { color: '#2DD4BF', fontWeight: '700', fontSize: 12 },
    issueForm: { marginTop: 12, gap: 8 },
    issueInput: {
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      color: COLORS.text,
      padding: 11, fontSize: 13,
    },
    issueSubmit: {
      backgroundColor: '#F59E0B',
      borderRadius: RADIUS.pill,
      paddingVertical: 10,
      alignItems: 'center',
    },
    issueSubmitText: { color: '#4A2A00', fontWeight: '800', fontSize: 13 },
  }));

  const load = useCallback(() => {
    fetchApi('/property/rentals')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setRentals(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const payRent = async (tenancy: any) => {
    try {
      setPaying(tenancy.id);
      const res = await fetchApi(`/property/tenancy/${tenancy.id}/pay`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Payment failed');
      Alert.alert(
        'Rent paid ✅',
        `${formatCurrency(tenancy.rentAmount)} paid for ${tenancy.currentPeriod}.\n\nReceipt: ${d.receiptNo}`,
      );
      load();
    } catch (e: any) {
      Alert.alert('Payment failed', e.message);
    } finally {
      setPaying(null);
    }
  };

  const submitIssue = async (tenancyId: string) => {
    if (!issueTitle.trim()) return;
    const res = await fetchApi(`/property/tenancy/${tenancyId}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title: issueTitle.trim(), description: issueDesc.trim() || undefined }),
    });
    if (res.ok) {
      setIssueFor(null);
      setIssueTitle('');
      setIssueDesc('');
      Alert.alert('Issue reported', 'Your agent has been notified.');
      load();
    } else {
      Alert.alert('Report failed', 'Could not report the issue');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Rentals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 14, paddingBottom: 40 }}>
        {rentals.length === 0 && (
          <Text style={styles.empty}>
            {loading ? 'Loading…' : 'No rentals yet. When an agent assigns you as a tenant, your rental appears here.'}
          </Text>
        )}

        {rentals.map(t => (
          <View key={t.id} style={styles.card}>
            <Text style={styles.title}>{t.property?.title}</Text>
            <Text style={styles.address}>{t.property?.address}</Text>
            <Text style={styles.agent}>
              Agent: {t.property?.agent?.profile?.displayName || t.property?.agent?.username}
            </Text>

            <View style={styles.rentRow}>
              <View>
                <Text style={styles.rentAmount}>{formatCurrency(t.rentAmount)} / month</Text>
                <Text style={[styles.rentStatus, { color: t.rentPaidThisMonth ? '#2DD4BF' : '#F87171' }]}>
                  {t.rentPaidThisMonth ? `✓ Paid for ${t.currentPeriod}` : `Due for ${t.currentPeriod}`}
                </Text>
              </View>
              {!t.rentPaidThisMonth && (
                <TouchableOpacity style={styles.payBtn} onPress={() => payRent(t)} disabled={paying === t.id}>
                  {paying === t.id ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="wallet" size={15} color="#FFF" />
                      <Text style={styles.payText}>Pay rent</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {t.payments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.subLabel}>RECEIPTS</Text>
                {t.payments.slice(0, 4).map((p: any) => (
                  <Text key={p.id} style={styles.receiptRow}>
                    🧾 {p.receiptNo} · {formatCurrency(p.amount)} · {p.period}
                  </Text>
                ))}
              </View>
            )}

            {t.issues.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.subLabel}>YOUR REPORTS</Text>
                {t.issues.slice(0, 3).map((i: any) => (
                  <Text key={i.id} style={styles.receiptRow}>
                    {i.status === 'RESOLVED' ? '✅' : i.status === 'IN_PROGRESS' ? '🔧' : '⚠️'} {i.title} — {i.status.replace('_', ' ')}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('Lease', { tenancyId: t.id })}
              >
                <Ionicons name="document-text" size={14} color="#2DD4BF" />
                <Text style={styles.actionText}>Lease</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setIssueFor(issueFor === t.id ? null : t.id)}
              >
                <Ionicons name="construct" size={14} color="#F59E0B" />
                <Text style={[styles.actionText, { color: '#F59E0B' }]}>Report issue</Text>
              </TouchableOpacity>
            </View>

            {issueFor === t.id && (
              <View style={styles.issueForm}>
                <TextInput
                  style={styles.issueInput}
                  placeholder="What's wrong? e.g. Geyser leaking"
                  placeholderTextColor={COLORS.textMuted}
                  value={issueTitle}
                  onChangeText={setIssueTitle}
                />
                <TextInput
                  style={[styles.issueInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Details (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={issueDesc}
                  onChangeText={setIssueDesc}
                  multiline
                />
                <TouchableOpacity style={styles.issueSubmit} onPress={() => submitIssue(t.id)}>
                  <Text style={styles.issueSubmitText}>Send to agent</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
