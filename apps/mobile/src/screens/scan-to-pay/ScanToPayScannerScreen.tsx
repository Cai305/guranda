import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, StyleSheet, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { beep } from '../../utils/beep';
import { PRODUCT_BARCODE_TYPES, ScanToPaySession, productIcon } from '../../utils/scanToPay';

type Pending = { barcode: string; name: string; price: string; qty: number };

export default function ScanToPayScannerScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState<ScanToPaySession | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [adding, setAdding] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const scanLockRef = useRef(false);

  const loadSession = useCallback(async () => {
    // Bypasses the GET cache — the remaining-budget pill must reflect what
    // was just scanned, not a snapshot from before this session had items.
    const res = await fetchApi(`/scan-to-pay/sessions/${sessionId}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (res.ok) {
      const data = await res.json();
      setSession(data);
      if (data.status !== 'ACTIVE') {
        navigation.replace('ScanToPayCart', { sessionId });
      }
    }
  }, [sessionId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadSession();
      scanLockRef.current = false;
    }, [loadSession]),
  );

  useEffect(() => {
    if (Platform.OS !== 'web' && !permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const openPendingItem = async (barcode: string) => {
    let name = '';
    let price = '';
    try {
      const res = await fetchApi(`/scan-to-pay/barcode-lookup/${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          name = data.name;
          price = String(data.price);
        }
      }
    } catch {
      // No prefill — customer just types it in, same as a first-ever scan.
    }
    setPending({ barcode, name, price, qty: 1 });
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanLockRef.current || pending) return;
    scanLockRef.current = true;
    beep();
    openPendingItem(data);
  };

  const dismissPending = () => {
    setPending(null);
    scanLockRef.current = false;
  };

  const confirmAdd = async () => {
    if (!pending) return;
    const priceNum = parseFloat(pending.price.replace(/[^0-9.]/g, ''));
    if (!pending.name.trim()) {
      Alert.alert('Missing product name', 'Type in what this item is before adding it.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      Alert.alert('Missing price', 'Enter the price shown on the shelf label.');
      return;
    }
    setAdding(true);
    try {
      const res = await fetchApi(`/scan-to-pay/sessions/${sessionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ barcode: pending.barcode, name: pending.name.trim(), price: priceNum, qty: pending.qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn't add that item.");
      setSession(data);
      setPending(null);
      scanLockRef.current = false;
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  const submitManual = () => {
    const barcode = manualBarcode.trim();
    if (!barcode) {
      Alert.alert('Missing barcode', 'Enter the number printed under the barcode.');
      return;
    }
    setShowManual(false);
    setManualBarcode('');
    openPendingItem(barcode).then(() => {
      // Manual entry already has name/price front-of-mind for the customer —
      // seed the sheet with what they typed rather than making them retype.
      if (manualName || manualPrice) {
        setPending((p) => (p ? { ...p, name: manualName || p.name, price: manualPrice || p.price } : p));
      }
      setManualName('');
      setManualPrice('');
    });
  };

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#0A0A0C' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingBottom: 0 },
    roundBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
    },
    storePill: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
    storePillText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    budgetPillWrap: { alignItems: 'center', marginTop: 14 },
    budgetPill: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
    },
    budgetPillLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    budgetPillValue: { color: COLORS.success, fontSize: 15, fontWeight: '800' },
    budgetPillDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)' },
    budgetPillItems: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    hintWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 220 },
    hintText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
    webNotice: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
    webNoticeText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
    bottomSheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: COLORS.border,
      paddingHorizontal: SPACING.lg, paddingTop: 16, paddingBottom: 26, gap: 14,
    },
    peekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    peekLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    peekIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.15)', justifyContent: 'center', alignItems: 'center' },
    peekTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    peekSubtitle: { color: COLORS.textMuted, fontSize: 11.5 },
    manualRow: { alignItems: 'center' },
    manualText: { color: COLORS.primary, fontSize: 12.5, fontWeight: '600' },

    // Scanned-item confirmation sheet
    itemSheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface,
      borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: COLORS.border,
      paddingHorizontal: SPACING.lg, paddingTop: 14, paddingBottom: 28, gap: 16,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333340', alignSelf: 'center' },
    itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    itemIcon: {
      width: 76, height: 76, borderRadius: 18, backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
    },
    itemFields: { flex: 1, gap: 8 },
    nameInput: { color: COLORS.text, fontSize: 17, fontWeight: '700', padding: 0 },
    barcodeText: { color: '#5A5A6E', fontSize: 11, fontFamily: 'monospace' },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    priceInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    priceCurrency: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
    priceInput: { color: COLORS.text, fontSize: 24, fontWeight: '800', minWidth: 70, padding: 0 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surfaceElevated, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 8 },
    qtyBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    qtyValue: { color: COLORS.text, fontSize: 15, fontWeight: '700', minWidth: 14, textAlign: 'center' },
    addBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
    addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    skipRow: { alignItems: 'center' },
    skipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
    modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    modalInput: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 15,
      borderWidth: 1, borderColor: COLORS.border,
    },
    modalBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    modalCancel: { alignItems: 'center', paddingTop: 4 },
    modalCancelText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  }));

  if (!session) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#FFF" />
      </SafeAreaView>
    );
  }

  const priceNum = pending ? parseFloat(pending.price.replace(/[^0-9.]/g, '')) : 0;
  const lineTotal = pending && Number.isFinite(priceNum) ? priceNum * pending.qty : 0;
  const cameraReady = Platform.OS !== 'web' && permission?.granted;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => navigation.replace('ScanToPayCart', { sessionId })}>
          <Ionicons name="close" size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.storePill}>
          <Text style={styles.storePillText} numberOfLines={1}>{session.merchant.name}</Text>
        </View>
        <TouchableOpacity style={styles.roundBtn} onPress={() => navigation.replace('ScanToPayCart', { sessionId })}>
          <Ionicons name="cart-outline" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {session.budget != null && (
        <View style={styles.budgetPillWrap}>
          <View style={styles.budgetPill}>
            <Text style={styles.budgetPillLabel}>REMAINING</Text>
            <Text style={styles.budgetPillValue}>{formatCurrency(session.remaining ?? 0)}</Text>
            <View style={styles.budgetPillDivider} />
            <Text style={styles.budgetPillItems}>{session.itemCount} item{session.itemCount === 1 ? '' : 's'}</Text>
          </View>
        </View>
      )}

      {cameraReady ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={pending ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: [...PRODUCT_BARCODE_TYPES] }}
        />
      ) : (
        <View style={styles.webNotice}>
          <Ionicons name="camera-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.webNoticeText}>
            {Platform.OS === 'web'
              ? "Camera scanning isn't supported in this preview — use manual entry below."
              : 'Camera permission is needed to scan barcodes.'}
          </Text>
        </View>
      )}

      {!pending && (
        <View style={styles.hintWrap} pointerEvents="none">
          {cameraReady && <Text style={styles.hintText}>Point your camera at the barcode</Text>}
        </View>
      )}

      {!pending && (
        <View style={styles.bottomSheet}>
          <TouchableOpacity style={styles.peekRow} onPress={() => navigation.replace('ScanToPayCart', { sessionId })}>
            <View style={styles.peekLeft}>
              <View style={styles.peekIcon}>
                <Ionicons name="cart-outline" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.peekTitle}>{session.itemCount} item{session.itemCount === 1 ? '' : 's'} · {formatCurrency(session.subtotal)}</Text>
                <Text style={styles.peekSubtitle}>Tap to view cart</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5A5A6E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualRow} onPress={() => setShowManual(true)}>
            <Text style={styles.manualText}>Can't scan? Enter manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {pending && (
        <View style={styles.itemSheet}>
          <View style={styles.grabber} />
          <View style={styles.itemTopRow}>
            <View style={styles.itemIcon}>
              <Ionicons name={productIcon(pending.name) as any} size={34} color={COLORS.textMuted} />
            </View>
            <View style={styles.itemFields}>
              <TextInput
                style={styles.nameInput}
                value={pending.name}
                onChangeText={(t) => setPending((p) => (p ? { ...p, name: t } : p))}
                placeholder="What is this item?"
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.barcodeText}>{pending.barcode}</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceInputRow}>
              <Text style={styles.priceCurrency}>R</Text>
              <TextInput
                style={styles.priceInput}
                value={pending.price}
                onChangeText={(t) => setPending((p) => (p ? { ...p, price: t } : p))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: COLORS.surfaceElevated }]}
                onPress={() => setPending((p) => (p ? { ...p, qty: Math.max(1, p.qty - 1) } : p))}
              >
                <Ionicons name="remove" size={14} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{pending.qty}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => setPending((p) => (p ? { ...p, qty: p.qty + 1 } : p))}
              >
                <Ionicons name="add" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={confirmAdd} disabled={adding} activeOpacity={0.85}>
            {adding ? <ActivityIndicator color="#FFF" /> : (
              <Text style={styles.addBtnText}>Add to Cart · {formatCurrency(lineTotal)}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipRow} onPress={dismissPending}>
            <Text style={styles.skipText}>Scan Next Item</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Enter barcode manually</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Barcode number"
              placeholderTextColor={COLORS.textMuted}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="number-pad"
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Product name (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={manualName}
              onChangeText={setManualName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Price (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={manualPrice}
              onChangeText={setManualPrice}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.modalBtn} onPress={submitManual}>
              <Text style={styles.modalBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowManual(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
