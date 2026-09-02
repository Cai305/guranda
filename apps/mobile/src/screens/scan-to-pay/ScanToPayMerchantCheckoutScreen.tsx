import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { shortId } from '../../utils/scanToPay';

type QrState = { qrValue: string; merchantName: string; storeName: string; generatedAt: string } | null;
type LinkedTxn = {
  id: string; total: number; status: string;
  items: { name: string }[];
  customer?: { username: string; displayName?: string };
} | null;

export default function ScanToPayMerchantCheckoutScreen({ route, navigation }: any) {
  const { storeId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [qr, setQr] = useState<QrState>(null);
  const [linked, setLinked] = useState<LinkedTxn>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateQr = useCallback(async () => {
    const res = await fetchApi(`/scan-to-pay/merchant/stores/${storeId}/checkout-qr`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setQr({ qrValue: data.qrValue, merchantName: data.merchantName, storeName: data.storeName, generatedAt: new Date().toISOString() });
      setLinked(null);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      generateQr();
      refreshRef.current = setInterval(generateQr, 45_000);
      return () => {
        if (refreshRef.current) clearInterval(refreshRef.current);
      };
    }, [generateQr]),
  );

  useEffect(() => {
    if (!qr || linked) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      // Bypasses the GET cache — this is polled specifically to catch a
      // payment landing; a cached "nothing yet" would never update.
      const res = await fetchApi(`/scan-to-pay/merchant/stores/${storeId}/latest-transaction?since=${encodeURIComponent(qr.generatedAt)}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setLinked(data);
          if (refreshRef.current) clearInterval(refreshRef.current);
        }
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qr, linked, storeId]);

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: SPACING.lg },
    storeLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
    qrWrap: { width: 240, height: 240, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, justifyContent: 'center', alignItems: 'center' },
    qrCaption: { color: COLORS.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
    refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    refreshDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary },
    refreshText: { color: COLORS.secondary, fontSize: 11.5, fontWeight: '600' },

    linkedCard: { margin: SPACING.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 20, gap: 16 },
    linkedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    linkedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    linkedAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    linkedName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    linkedId: { color: '#5A5A6E', fontSize: 11, fontFamily: 'monospace' },
    paidBadge: { backgroundColor: 'rgba(52,211,153,0.14)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
    paidBadgeText: { color: COLORS.success, fontSize: 11, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, backgroundColor: COLORS.surfaceElevated, borderRadius: 12, padding: 12 },
    statLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    statValue: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
    newCheckoutBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    newCheckoutText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      {!qr ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.text} /></View>
      ) : !linked ? (
        <View style={styles.center}>
          <Text style={styles.storeLabel}>{qr.merchantName.toUpperCase()} · {qr.storeName.toUpperCase()}</Text>
          <View style={styles.qrWrap}>
            <QRCode value={qr.qrValue} size={208} color="#0A0A0C" backgroundColor="#FFFFFF" />
          </View>
          <Text style={styles.qrCaption}>Ask the customer to scan this{'\n'}with Scan to Pay to connect & pay</Text>
          <View style={styles.refreshRow}>
            <View style={styles.refreshDot} />
            <Text style={styles.refreshText}>Refreshes every 45s for security</Text>
          </View>
        </View>
      ) : (
        <View style={styles.linkedCard}>
          <View style={styles.linkedTop}>
            <View style={styles.linkedLeft}>
              <View style={styles.linkedAvatar}>
                <Ionicons name="person" size={18} color={COLORS.textMuted} />
              </View>
              <View>
                <Text style={styles.linkedName}>{linked.customer?.displayName || linked.customer?.username || 'Customer'}</Text>
                <Text style={styles.linkedId}>{shortId(linked.id, 'TXN')}</Text>
              </View>
            </View>
            <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>PAID</Text></View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}><Text style={styles.statLabel}>ITEMS</Text><Text style={styles.statValue}>{linked.items.length}</Text></View>
            <View style={styles.statBox}><Text style={styles.statLabel}>TOTAL</Text><Text style={styles.statValue}>{formatCurrency(linked.total)}</Text></View>
          </View>
          <TouchableOpacity style={styles.newCheckoutBtn} onPress={generateQr}>
            <Text style={styles.newCheckoutText}>New Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
