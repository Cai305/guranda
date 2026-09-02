import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { PRODUCT_BARCODE_TYPES, ScanToPayReceipt } from '../../utils/scanToPay';

const LEVELS = [
  { key: 0, label: 'No Item Scan' },
  { key: 1, label: 'Scan 1 Item' },
  { key: 2, label: 'Scan 2 Items' },
  { key: 3, label: 'Scan All Items' },
];

type ItemResult = { barcode: string; verified: boolean; name?: string };

export default function ScanToPaySecurityScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [receipt, setReceipt] = useState<ScanToPayReceipt | null>(null);
  const [manualId, setManualId] = useState('');
  const [level, setLevel] = useState(1);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [scanningItem, setScanningItem] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' && !permission?.granted) requestPermission();
  }, []);

  const loadReceipt = async (id: string) => {
    if (!id.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetchApi(`/scan-to-pay/security/receipts/${id.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Receipt not found.');
      setReceipt(data);
      setResults([]);
      setScanLocked(false);
    } catch (e: any) {
      Alert.alert('Not verified', e?.message || 'Could not verify this receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptScanned = ({ data }: { data: string }) => {
    if (scanLocked || loading) return;
    setScanLocked(true);
    loadReceipt(data);
  };

  const handleItemScanned = ({ data }: { data: string }) => {
    if (scanLocked || !receipt) return;
    setScanLocked(true);
    verifyItem(data);
  };

  const verifyItem = async (barcode: string) => {
    if (!receipt) return;
    const res = await fetchApi('/scan-to-pay/security/verify-item', {
      method: 'POST',
      body: JSON.stringify({ transactionId: receipt.id, barcode }),
    });
    const data = await res.json();
    setResults((prev) => [{ barcode, verified: !!data.verified, name: data.item?.name }, ...prev]);
    setScanningItem(false);
    setScanLocked(false);
  };

  const reset = () => {
    setReceipt(null);
    setManualId('');
    setResults([]);
    setScanLocked(false);
    setScanningItem(false);
  };

  const targetCount = level === 3 ? Infinity : level;
  const canScanMore = receipt && results.length < targetCount;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.title}>Security Check</Text>
        <View style={{ width: 40 }} />
      </View>

      {!receipt ? (
        <View style={{ flex: 1 }}>
          {Platform.OS !== 'web' && permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={handleReceiptScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
          ) : null}
          <View style={s.scanReceiptWrap}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="qr-code-outline" size={40} color="rgba(255,255,255,0.6)" />
                <Text style={s.scanReceiptHint}>Scan the customer's receipt QR</Text>
              </>
            )}
            <View style={s.manualCard}>
              <TextInput
                style={s.manualInput}
                value={manualId}
                onChangeText={setManualId}
                placeholder="Or enter the receipt ID"
                placeholderTextColor="#5A5A6E"
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.manualBtn} onPress={() => loadReceipt(manualId)}>
                <Text style={s.manualBtnText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : scanningItem ? (
        <View style={{ flex: 1 }}>
          {Platform.OS !== 'web' && permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={handleItemScanned}
              barcodeScannerSettings={{ barcodeTypes: PRODUCT_BARCODE_TYPES as any }}
            />
          ) : null}
          <View style={s.scanReceiptWrap}>
            <Text style={s.scanReceiptHint}>Scan a product barcode</Text>
            <View style={s.manualCard}>
              <TextInput style={s.manualInput} value={manualId} onChangeText={setManualId} placeholder="Or enter the barcode" placeholderTextColor="#5A5A6E" />
              <TouchableOpacity style={s.manualBtn} onPress={() => { verifyItem(manualId); setManualId(''); }}>
                <Text style={s.manualBtnText}>Check</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setScanningItem(false)}><Text style={s.cancelLink}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={s.verifiedBanner}>
            <View style={s.verifiedTop}>
              <View style={s.verifiedIcon}><Ionicons name="checkmark" size={20} color="#34D399" /></View>
              <Text style={s.verifiedTitle}>PAYMENT VERIFIED</Text>
            </View>
            <View style={s.verifiedDetails}>
              <View style={s.detailRow}><Text style={s.detailLabel}>Merchant</Text><Text style={s.detailValue}>{receipt.merchant.name}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Store</Text><Text style={s.detailValue}>{receipt.store.name}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Transaction</Text><Text style={s.detailValueMono}>TXN-{receipt.id.slice(0, 8).toUpperCase()}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Total</Text><Text style={s.detailValue}>{formatCurrency(receipt.total)}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLabel}>Items purchased</Text><Text style={s.detailValue}>{receipt.items.reduce((sum, i) => sum + i.qty, 0)}</Text></View>
            </View>
          </View>

          <Text style={s.sectionLabel}>VERIFICATION LEVEL</Text>
          <View style={s.levelRow}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[s.levelChip, level === l.key && s.levelChipOn]}
                onPress={() => setLevel(l.key)}
              >
                <Text style={[s.levelChipText, level === l.key && s.levelChipTextOn]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {level > 0 && (
            <>
              <Text style={s.sectionLabel}>SCANNED AT EXIT</Text>
              <View style={{ paddingHorizontal: 20, gap: 8, marginTop: 10 }}>
                {results.length === 0 && <Text style={s.emptyHint}>No items scanned yet.</Text>}
                {results.map((r, i) => (
                  <View key={i} style={[s.resultRow, r.verified ? s.resultRowOk : s.resultRowBad]}>
                    <View style={[s.resultIcon, { backgroundColor: r.verified ? 'rgba(52,211,153,0.16)' : 'rgba(248,113,113,0.16)' }]}>
                      <Ionicons name={r.verified ? 'checkmark' : 'alert-outline'} size={16} color={r.verified ? '#34D399' : '#F87171'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: r.verified ? '#34D399' : '#F87171', fontSize: 12.5, fontWeight: '700' }}>
                        {r.verified ? 'ITEM VERIFIED' : 'ITEM NOT FOUND ON RECEIPT'}
                      </Text>
                      <Text style={s.resultMeta}>{r.name || r.barcode}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {canScanMore && (
                <TouchableOpacity style={s.scanItemBtn} onPress={() => setScanningItem(true)}>
                  <Ionicons name="scan-outline" size={16} color="#FFF" />
                  <Text style={s.scanItemBtnText}>Scan Item</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={s.exitRow}>
            <TouchableOpacity style={s.exitBtn} onPress={reset}>
              <Text style={s.exitBtnText}>Clear to Exit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07070C' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A26', borderWidth: 1, borderColor: '#22222E', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  scanReceiptWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 30 },
  scanReceiptHint: { color: '#FFF', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  manualCard: { width: '100%', gap: 10, marginTop: 10 },
  manualInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#FFF', fontSize: 13 },
  manualBtn: { backgroundColor: '#8B5CF6', borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  manualBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  cancelLink: { color: '#9494AB', fontSize: 12.5, fontWeight: '600', marginTop: 4 },
  verifiedBanner: { margin: 20, backgroundColor: '#0F3D2E', borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)', borderRadius: 22, padding: 20, gap: 14 },
  verifiedTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifiedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(52,211,153,0.2)', justifyContent: 'center', alignItems: 'center' },
  verifiedTitle: { color: '#34D399', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  verifiedDetails: { gap: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(52,211,153,0.25)' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  detailValue: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  detailValueMono: { color: '#FFF', fontSize: 12, fontFamily: 'monospace' },
  sectionLabel: { color: '#9494AB', fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, paddingHorizontal: 20, marginTop: 6 },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 10 },
  levelChip: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, backgroundColor: '#12121A', borderColor: '#22222E' },
  levelChipOn: { backgroundColor: 'rgba(139,92,246,0.18)', borderColor: '#8B5CF6' },
  levelChipText: { color: '#9494AB', fontSize: 12.5, fontWeight: '700' },
  levelChipTextOn: { color: '#C9BFE8' },
  emptyHint: { color: '#5A5A6E', fontSize: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12, borderWidth: 1 },
  resultRowOk: { backgroundColor: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.3)' },
  resultRowBad: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.3)' },
  resultIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  resultMeta: { color: '#9494AB', fontSize: 11.5, marginTop: 1 },
  scanItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8B5CF6', borderRadius: 999, marginHorizontal: 20, marginTop: 16, paddingVertical: 14 },
  scanItemBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },
  exitRow: { paddingHorizontal: 20, marginTop: 20 },
  exitBtn: { backgroundColor: '#34D399', borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  exitBtnText: { color: '#06231A', fontSize: 14, fontWeight: '700' },
});
