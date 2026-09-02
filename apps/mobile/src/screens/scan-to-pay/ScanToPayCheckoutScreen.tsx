import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, StyleSheet, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import { beep } from '../../utils/beep';
import { CHECKOUT_QR_TYPES, ScanToPaySession } from '../../utils/scanToPay';

function parseCheckoutQr(data: string): { storeId: string; token: string } | null {
  try {
    const url = new URL(data);
    const storeId = url.searchParams.get('storeId');
    const token = url.searchParams.get('token');
    if (storeId && token) return { storeId, token };
  } catch {
    // Not a URL — fall through
  }
  return null;
}

export default function ScanToPayCheckoutScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState<ScanToPaySession | null>(null);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const scanLockRef = useRef(false);

  useEffect(() => {
    // Bypasses the GET cache — the total confirmed here must be the cart's
    // real current total, not whatever was cached from an earlier read.
    fetchApi(`/scan-to-pay/sessions/${sessionId}`, { headers: { 'Cache-Control': 'no-cache' } })
      .then((r) => r.json())
      .then(setSession)
      .catch(() => Alert.alert('Error', "Couldn't load your cart."));
  }, [sessionId]);

  useEffect(() => {
    if (Platform.OS !== 'web' && !permission?.granted) requestPermission();
  }, [permission]);

  const handleQrScanned = ({ data }: { data: string }) => {
    if (scanLockRef.current || checkoutToken) return;
    const parsed = parseCheckoutQr(data);
    if (!parsed) return;
    if (parsed.storeId !== session?.store.id) {
      Alert.alert('Wrong store', 'That QR code is for a different store.');
      return;
    }
    scanLockRef.current = true;
    beep();
    setCheckoutToken(parsed.token);
  };

  const submitManual = () => {
    const token = manualToken.trim();
    if (!token) return;
    setShowManual(false);
    setManualToken('');
    setCheckoutToken(token);
  };

  const completePayment = async () => {
    if (!checkoutToken) return;
    setPaying(true);
    try {
      const res = await fetchApi(`/scan-to-pay/sessions/${sessionId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ checkoutToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment failed.');
      navigation.replace('ScanToPayPaymentStatus', { transactionId: data.id });
    } catch (e: any) {
      Alert.alert('Payment failed', e.message);
      setCheckoutToken(null);
      scanLockRef.current = false;
    } finally {
      setPaying(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    root: { flex: 1, backgroundColor: '#0A0A0C' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingBottom: 0 },
    roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    statusPill: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
    statusPillText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    webNoticeText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
    manualLink: { marginTop: 6 },
    manualLinkText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
    connectedText: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 16, textAlign: 'center' },

    sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.lg, paddingBottom: 28, gap: 16 },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333340', alignSelf: 'center' },
    merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    merchantAvatar: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#4C1D95', justifyContent: 'center', alignItems: 'center' },
    merchantAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    merchantName: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
    merchantMeta: { color: COLORS.textMuted, fontSize: 12 },
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surfaceElevated, borderRadius: 14, padding: 16 },
    statLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    statValue: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
    statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
    payBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
    payBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    walletText: { color: '#5A5A6E', fontSize: 11.5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
    modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    modalInput: { backgroundColor: COLORS.surfaceElevated, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
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

  const cameraReady = Platform.OS !== 'web' && permission?.granted;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>Scan store QR to pay</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!checkoutToken && (
        cameraReady ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={handleQrScanned}
            barcodeScannerSettings={{ barcodeTypes: [...CHECKOUT_QR_TYPES] }}
          />
        ) : (
          <View style={styles.center}>
            <Ionicons name="qr-code-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.webNoticeText}>
              {Platform.OS === 'web'
                ? "Camera scanning isn't supported in this preview."
                : 'Camera permission is needed to scan the till QR.'}
            </Text>
            <TouchableOpacity style={styles.manualLink} onPress={() => setShowManual(true)}>
              <Text style={styles.manualLinkText}>Enter checkout code manually</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {checkoutToken && (
        <View style={styles.center}>
          <ActivityIndicator color="#22D3EE" />
          <Text style={styles.connectedText}>Connected · confirming your total…</Text>
        </View>
      )}

      {checkoutToken && (
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.merchantRow}>
            <View style={styles.merchantAvatar}>
              <Text style={styles.merchantAvatarText}>
                {session.merchant.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.merchantName}>{session.merchant.name}</Text>
              <Text style={styles.merchantMeta}>{session.store.name}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View><Text style={styles.statLabel}>ITEMS</Text><Text style={styles.statValue}>{session.itemCount}</Text></View>
            <View style={styles.statDivider} />
            <View style={{ alignItems: 'flex-end' }}><Text style={styles.statLabel}>TOTAL</Text><Text style={styles.statValue}>{formatCurrency(session.subtotal)}</Text></View>
          </View>

          <TouchableOpacity style={styles.payBtn} onPress={completePayment} disabled={paying} activeOpacity={0.85}>
            {paying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payBtnText}>Complete Payment</Text>}
          </TouchableOpacity>

          <View style={styles.walletRow}>
            <Ionicons name="card-outline" size={13} color="#5A5A6E" />
            <Text style={styles.walletText}>Paying via Guranda Wallet{user?.username ? ` · @${user.username}` : ''}</Text>
          </View>
        </View>
      )}

      <Modal visible={showManual} transparent animationType="slide" onRequestClose={() => setShowManual(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Enter checkout code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Code shown on the till screen"
              placeholderTextColor={COLORS.textMuted}
              value={manualToken}
              onChangeText={setManualToken}
              autoFocus
              autoCapitalize="none"
              onSubmitEditing={submitManual}
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
