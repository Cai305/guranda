import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { shortId, ScanToPayReceipt } from '../../utils/scanToPay';

export default function ScanToPayReceiptScreen({ route, navigation }: any) {
  const { transactionId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [receipt, setReceipt] = useState<ScanToPayReceipt | null>(null);

  useEffect(() => {
    fetchApi(`/scan-to-pay/receipts/${transactionId}`)
      .then((r) => r.json())
      .then(setReceipt)
      .catch(() => Alert.alert('Error', "Couldn't load this receipt."));
  }, [transactionId]);

  const shareReceipt = () => {
    if (!receipt) return;
    Share.share({
      message: `Guranda receipt · ${receipt.merchant.name} · ${formatCurrency(receipt.total)} · ${shortId(receipt.id, 'TXN')}`,
    }).catch(() => {});
  };

  const reportIssue = () => {
    Alert.alert('Report an issue', 'Contact the merchant or Guranda support with this receipt open to look into a problem with this purchase.');
  };

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 4 },
    roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
    card: { margin: SPACING.lg, marginTop: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 22, gap: 18 },
    merchantBlock: { alignItems: 'center', gap: 4 },
    merchantAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#4C1D95', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    merchantAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    merchantName: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
    merchantMeta: { color: COLORS.textMuted, fontSize: 12 },
    paidPill: { backgroundColor: 'rgba(52,211,153,0.14)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
    paidPillText: { color: COLORS.success, fontSize: 11, fontWeight: '700' },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
    metaLabel: { color: '#5A5A6E', fontSize: 11.5 },
    metaValue: { color: COLORS.textMuted, fontSize: 11.5, fontFamily: 'monospace' },
    lineItems: { gap: 10, paddingTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
    lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
    lineName: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
    lineBarcode: { color: '#5A5A6E', fontSize: 10, fontFamily: 'monospace' },
    lineAmount: { color: COLORS.text, fontSize: 13 },
    totals: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { color: COLORS.textMuted, fontSize: 12.5 },
    totalValue: { color: COLORS.textMuted, fontSize: 12.5 },
    grandRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    grandLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    grandValue: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    qrBlock: { alignItems: 'center', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
    qrWrap: { width: 120, height: 120, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, justifyContent: 'center', alignItems: 'center' },
    qrCaption: { color: '#5A5A6E', fontSize: 10.5 },
    actionsRow: { flexDirection: 'row', gap: 10, marginHorizontal: SPACING.lg, marginTop: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 13 },
    actionBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    reportBtnText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
  }));

  if (!receipt) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.text} />
      </SafeAreaView>
    );
  }

  const qrValue = `guranda://scan-to-pay/verify?transactionId=${receipt.id}`;
  const date = receipt.paidAt ? new Date(receipt.paidAt) : new Date(receipt.createdAt);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => navigation.popToTop()}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        <TouchableOpacity style={styles.roundBtn} onPress={shareReceipt}>
          <Ionicons name="share-outline" size={17} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.card}>
          <View style={styles.merchantBlock}>
            <View style={styles.merchantAvatar}>
              <Text style={styles.merchantAvatarText}>
                {receipt.merchant.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.merchantName}>{receipt.merchant.name}</Text>
            <Text style={styles.merchantMeta}>{receipt.store.name}{receipt.store.address ? ` · ${receipt.store.address}` : ''}</Text>
            <View style={styles.paidPill}><Text style={styles.paidPillText}>{receipt.status}</Text></View>
          </View>

          <View style={styles.metaRow}><Text style={styles.metaLabel}>Transaction</Text><Text style={styles.metaValue}>{shortId(receipt.id, 'TXN')}</Text></View>
          <View style={[styles.metaRow, { marginTop: -10 }]}><Text style={styles.metaLabel}>Date</Text><Text style={styles.metaValue}>{date.toLocaleDateString()}, {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>

          <View style={styles.lineItems}>
            {receipt.items.map((item, i) => (
              <View key={`${item.barcode}-${i}`} style={styles.lineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{item.name}</Text>
                  <Text style={styles.lineBarcode}>{item.barcode} · x{item.qty}</Text>
                </View>
                <Text style={styles.lineAmount}>{formatCurrency(item.price * item.qty)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totals}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatCurrency(receipt.subtotal)}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Discounts</Text><Text style={styles.totalValue}>{formatCurrency(receipt.discount)}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Fees</Text><Text style={styles.totalValue}>{formatCurrency(receipt.fees)}</Text></View>
            <View style={styles.grandRow}><Text style={styles.grandLabel}>Total Paid</Text><Text style={styles.grandValue}>{formatCurrency(receipt.total)}</Text></View>
          </View>

          <View style={styles.qrBlock}>
            <View style={styles.qrWrap}>
              <QRCode value={qrValue} size={104} color="#0A0A0C" backgroundColor="#FFFFFF" />
            </View>
            <Text style={styles.qrCaption}>Secure receipt QR · {shortId(receipt.id, 'RCT')}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={shareReceipt}>
            <Ionicons name="share-outline" size={15} color={COLORS.text} />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={reportIssue}>
            <Ionicons name="warning-outline" size={15} color={COLORS.error} />
            <Text style={styles.reportBtnText}>Report an issue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
