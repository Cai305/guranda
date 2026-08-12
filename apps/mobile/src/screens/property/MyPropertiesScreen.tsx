import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';

// Agent dashboard: every property you manage, with per-tenant rent status
// for the current month, receipts, open issues and lease access.

const ISSUE_NEXT: Record<string, string> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
};

const issueDot = (status: string) => ({
  color: status === 'RESOLVED' ? '#2DD4BF' : status === 'IN_PROGRESS' ? '#F59E0B' : '#DC2626',
  fontSize: 10,
});

export default function MyPropertiesScreen({ navigation }: any) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    propCard: {
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      padding: 14,
    },
    propHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    propTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15, flex: 1 },
    propPrice: { color: '#2DD4BF', fontWeight: '800', fontSize: 13 },
    propAddress: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
    vacantRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginTop: 10,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: RADIUS.md,
      padding: 10,
    },
    vacantText: { color: COLORS.textMuted, fontSize: 12.5 },
    tenancyCard: {
      marginTop: 10,
      backgroundColor: 'rgba(45,212,191,0.06)',
      borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)',
      borderRadius: RADIUS.md,
      padding: 12,
    },
    tenancyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tenantName: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    rentPill: { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
    rentPaid: { backgroundColor: '#2DD4BF' },
    rentDue: { backgroundColor: '#DC2626' },
    rentPillText: { fontSize: 9.5, fontWeight: '800' },
    receipts: { marginTop: 10 },
    subLabel: { color: COLORS.textMuted, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
    receiptRow: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    issueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    issueTitle: { color: COLORS.text, fontSize: 12.5, flex: 1 },
    issueState: { color: COLORS.textMuted, fontSize: 10 },
    leaseBtn: {
      flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start',
      marginTop: 10,
      borderWidth: 1, borderColor: 'rgba(45,212,191,0.5)',
      borderRadius: RADIUS.pill,
      paddingVertical: 6, paddingHorizontal: 12,
    },
    leaseBtnText: { color: '#2DD4BF', fontWeight: '700', fontSize: 12 },
  }));

  const load = useCallback(() => {
    fetchApi('/property/mine')
      .then(res => (res.ok ? res.json() : []))
      .then(data => Array.isArray(data) && setProperties(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const advanceIssue = async (issue: any) => {
    const next = ISSUE_NEXT[issue.status];
    if (!next) return;
    const res = await fetchApi(`/property/issues/${issue.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) load();
    else Alert.alert('Update failed', 'Could not update the issue');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>My Properties</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 14, paddingBottom: 40 }}>
        {properties.length === 0 && (
          <Text style={styles.empty}>
            {loading ? 'Loading…' : "You haven't listed any properties yet. List one from the Property home to become an agent."}
          </Text>
        )}

        {properties.map(p => (
          <View key={p.id} style={styles.propCard}>
            <View style={styles.propHeader}>
              <Text style={styles.propTitle}>{p.title}</Text>
              <Text style={styles.propPrice}>{formatCurrency(p.price)}{p.listingType === 'RENT' ? '/mo' : ''}</Text>
            </View>
            <Text style={styles.propAddress}>{p.address}</Text>

            {p.tenancies.length === 0 ? (
              <TouchableOpacity
                style={styles.vacantRow}
                onPress={() => navigation.navigate('PropertyDetail', { propertyId: p.id })}
              >
                <Text style={styles.vacantText}>
                  {p.available ? 'Vacant — tap to assign a tenant' : 'No active tenancy'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : (
              p.tenancies.map((t: any) => (
                <View key={t.id} style={styles.tenancyCard}>
                  <View style={styles.tenancyHeader}>
                    <Text style={styles.tenantName}>
                      @{t.tenant?.username} · {formatCurrency(t.rentAmount)}/mo
                    </Text>
                    <View style={[styles.rentPill, t.rentPaidThisMonth ? styles.rentPaid : styles.rentDue]}>
                      <Text style={[styles.rentPillText, { color: t.rentPaidThisMonth ? '#04291B' : '#FFF' }]}>
                        {t.rentPaidThisMonth ? `PAID ${t.currentPeriod}` : `DUE ${t.currentPeriod}`}
                      </Text>
                    </View>
                  </View>

                  {/* Receipts */}
                  {t.payments.length > 0 && (
                    <View style={styles.receipts}>
                      <Text style={styles.subLabel}>RECEIPTS</Text>
                      {t.payments.slice(0, 3).map((pay: any) => (
                        <Text key={pay.id} style={styles.receiptRow}>
                          🧾 {pay.receiptNo} — {formatCurrency(pay.amount)} for {pay.period}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Issues */}
                  {t.issues.length > 0 && (
                    <View style={styles.receipts}>
                      <Text style={styles.subLabel}>ISSUES ({t.openIssues} open)</Text>
                      {t.issues.slice(0, 4).map((iss: any) => (
                        <TouchableOpacity
                          key={iss.id}
                          style={styles.issueRow}
                          onPress={() =>
                            iss.status !== 'RESOLVED' &&
                            Alert.alert(
                              iss.title,
                              `${iss.description || 'No details'}\n\nStatus: ${iss.status}`,
                              [
                                { text: 'Close', style: 'cancel' },
                                {
                                  text: iss.status === 'OPEN' ? 'Mark In Progress' : 'Mark Resolved',
                                  onPress: () => advanceIssue(iss),
                                },
                              ],
                            )
                          }
                        >
                          <Text style={issueDot(iss.status)}>●</Text>
                          <Text style={styles.issueTitle} numberOfLines={1}>{iss.title}</Text>
                          <Text style={styles.issueState}>{iss.status.replace('_', ' ')}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.leaseBtn}
                    onPress={() => navigation.navigate('Lease', { tenancyId: t.id })}
                  >
                    <Ionicons name="document-text" size={14} color="#2DD4BF" />
                    <Text style={styles.leaseBtnText}>View lease</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
