import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { shortId, ScanToPayReceipt } from '../../utils/scanToPay';

export default function ScanToPayPaymentStatusScreen({ route, navigation }: any) {
  const { transactionId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [receipt, setReceipt] = useState<ScanToPayReceipt | null>(null);

  useEffect(() => {
    fetchApi(`/scan-to-pay/receipts/${transactionId}`)
      .then((r) => r.json())
      .then(setReceipt)
      .catch(() => {});
  }, [transactionId]);

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },
    badge: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
    title: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginTop: 22 },
    amount: { color: COLORS.success, fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 },
    subtitle: { color: COLORS.textMuted, fontSize: 13.5, marginTop: 6 },
    idCard: { marginTop: 26, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, gap: 8, width: 260 },
    idRow: { flexDirection: 'row', justifyContent: 'space-between' },
    idLabel: { color: COLORS.textMuted, fontSize: 12 },
    idValue: { color: COLORS.text, fontSize: 12, fontFamily: 'monospace' },
    timeline: { flexDirection: 'row', alignItems: 'center', marginTop: 28, gap: 6 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    stepLabel: { fontSize: 10.5, fontWeight: '600' },
    connector: { width: 20, height: 2 },
    footer: { width: '100%', padding: SPACING.lg, paddingBottom: 30, gap: 12 },
    receiptBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
    receiptBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    doneRow: { alignItems: 'center' },
    doneText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  }));

  if (!receipt) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.text} />
      </SafeAreaView>
    );
  }

  const failed = receipt.status === 'FAILED';
  const doneToHub = () => navigation.popToTop();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }} />

      <LinearGradient
        colors={failed ? ['#F87171', '#EF4444'] : ['#10B981', '#22D3EE']}
        style={[styles.badge, { shadowColor: failed ? '#F87171' : '#10B981', shadowOpacity: 0.35, shadowRadius: 60, elevation: 8 }]}
      >
        <Ionicons name={failed ? 'close' : 'checkmark'} size={46} color="#FFF" />
      </LinearGradient>

      <Text style={styles.title}>{failed ? 'Payment Failed' : 'Payment Successful'}</Text>
      <Text style={styles.amount}>{formatCurrency(receipt.total)}</Text>
      <Text style={styles.subtitle}>{failed ? `Not charged · ${receipt.merchant.name}` : `Paid to ${receipt.merchant.name}`}</Text>

      <View style={styles.idCard}>
        <View style={styles.idRow}><Text style={styles.idLabel}>Transaction ID</Text><Text style={styles.idValue}>{shortId(receipt.id, 'TXN')}</Text></View>
        <View style={styles.idRow}><Text style={styles.idLabel}>Payment ID</Text><Text style={styles.idValue}>{shortId(receipt.id, 'PAY')}</Text></View>
      </View>

      {!failed && (
        <View style={styles.timeline}>
          <View style={styles.step}><View style={[styles.dot, { backgroundColor: COLORS.success }]} /><Text style={[styles.stepLabel, { color: '#5A5A6E' }]}>PENDING</Text></View>
          <View style={[styles.connector, { backgroundColor: COLORS.success }]} />
          <View style={styles.step}><View style={[styles.dot, { backgroundColor: COLORS.success }]} /><Text style={[styles.stepLabel, { color: '#5A5A6E' }]}>PROCESSING</Text></View>
          <View style={[styles.connector, { backgroundColor: COLORS.success }]} />
          <View style={styles.step}><View style={[styles.dot, { backgroundColor: COLORS.success }]} /><Text style={[styles.stepLabel, { color: COLORS.success }]}>PAID</Text></View>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        {!failed && (
          <TouchableOpacity style={styles.receiptBtn} onPress={() => navigation.replace('ScanToPayReceipt', { transactionId })}>
            <Text style={styles.receiptBtnText}>View Receipt</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.doneRow} onPress={doneToHub}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
