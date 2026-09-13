import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { syncLocation } from '../utils/locationSync';
import { RADAR_BOX, RADAR_CENTER, RING_MAX_PX, colorForId, RadarBackdrop, RadarAvatar } from '../components/ProximityRadar';

type NearbyPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  distanceMeters: number;
  bearingDeg: number;
};

const RADIUS_MIN = 20;
const RADIUS_MAX = 300;
const RADIUS_STEP = 20;
const DEFAULT_RADIUS = 60;
const POLL_INTERVAL_MS = 15_000;
const MAX_RENDERED = 12; // beyond this the radar just gets cluttered — the count caption covers the rest

const AMOUNT_CHIPS = [10, 50, 100, 200];

export default function AirPayScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { isVerified, refreshVerification } = useAuth();

  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS);
  const [visibility, setVisibility] = useState<'contacts' | 'everyone'>('everyone');
  const [people, setPeople] = useState<NearbyPerson[]>([]);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<{ name: string; amount: string } | null>(null);

  const didInitRef = useRef(false);

  const fetchNearby = useCallback(async (radius: number, contactsOnly: boolean) => {
    try {
      const res = await fetchApi(`/wallets/airpay/nearby?radiusMeters=${radius}&contactsOnly=${contactsOnly}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNeedsLocation(!!data.needsLocation);
      setPeople(Array.isArray(data.people) ? data.people : []);
    } catch {
      // best-effort — the radar just keeps showing whatever it last had
    }
  }, []);

  useFocusEffect(useCallback(() => { refreshVerification(); }, [refreshVerification]));

  // First load: make sure our own GPS fix is fresh before asking who's nearby.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncLocation().catch(() => {});
      if (cancelled) return;
      await fetchNearby(radiusMeters, visibility === 'contacts');
      if (!cancelled) {
        didInitRef.current = true;
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced refetch whenever the radius stepper or the contacts/everyone
  // toggle changes.
  useEffect(() => {
    if (!didInitRef.current) return;
    const t = setTimeout(() => { fetchNearby(radiusMeters, visibility === 'contacts'); }, 350);
    return () => clearTimeout(t);
  }, [radiusMeters, visibility, fetchNearby]);

  // Keep the radar "live" while this screen is on top.
  useFocusEffect(useCallback(() => {
    const id = setInterval(() => { fetchNearby(radiusMeters, visibility === 'contacts'); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMeters, visibility]));

  const bumpRadius = (delta: number) => {
    setRadiusMeters((r) => Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, r + delta)));
  };

  const handleEnableLocation = async () => {
    setLocating(true);
    await syncLocation().catch(() => {});
    await fetchNearby(radiusMeters, visibility === 'contacts');
    setLocating(false);
  };

  const openSheet = (p: NearbyPerson) => {
    setSelected(p);
    setAmount('');
    setSendError(null);
    setSentInfo(null);
  };
  const closeSheet = () => {
    if (sending) return;
    setSelected(null);
  };

  const pickChip = (value: number) => {
    setAmount(String(value));
    setSendError(null);
  };

  const handleSend = async () => {
    if (!selected) return;
    const value = Number(amount);
    if (!(value > 0)) {
      setSendError('Enter a valid amount.');
      return;
    }
    setSendError(null);
    setSending(true);
    try {
      const res = await fetchApi('/wallets/send', {
        method: 'POST',
        body: JSON.stringify({ destination: selected.username, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');
      setSentInfo({ name: selected.displayName, amount: formatCurrency(value) });
    } catch (e: any) {
      setSendError(e.message || 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  const doneAfterSend = () => {
    setSentInfo(null);
    setSelected(null);
    fetchNearby(radiusMeters, visibility === 'contacts');
  };

  const accent = COLORS.primary;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    visibilityRow: { flexDirection: 'row', alignSelf: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, padding: 4, gap: 4, marginTop: 4 },
    visibilityChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
    visibilityChipText: { fontSize: 13, fontWeight: '600' },
    radiusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 },
    radiusBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    radiusBtnDisabled: { opacity: 0.35 },
    radiusLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, minWidth: 96, textAlign: 'center' },
    radiusCaption: { textAlign: 'center', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginTop: 6 },
    radarWrap: { width: RADAR_BOX, height: RADAR_BOX, alignSelf: 'center', marginTop: 18 },
    ring: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
    northTick: { position: 'absolute', left: RADAR_CENTER - 8, top: RADAR_CENTER - RING_MAX_PX - 16, width: 16, textAlign: 'center', fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
    centerAvatar: { position: 'absolute', left: RADAR_CENTER - 30, top: RADAR_CENTER - 30, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
    centerLabel: { position: 'absolute', left: 0, top: RADAR_CENTER + 36, width: RADAR_BOX, textAlign: 'center', fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
    personAvatar: { position: 'absolute', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    personInitial: { fontSize: 16, fontWeight: '800', color: '#07070C' },
    personLabelWrap: { position: 'absolute', width: 76, alignItems: 'center' },
    personDistanceChip: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, marginBottom: 2 },
    personDistanceText: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted },
    personName: { fontSize: 11, fontWeight: '600', color: COLORS.text },
    captionRow: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, marginTop: 6, paddingHorizontal: SPACING.lg },
    centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 14 },
    emptyTitle: { ...TYPOGRAPHY.h3, textAlign: 'center' },
    emptyBody: { ...TYPOGRAPHY.body2, textAlign: 'center' },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 14, borderRadius: RADIUS.md },
    primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: SPACING.lg },
    errorCard: { borderColor: COLORS.error, marginTop: 12 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 18 },
    recipientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    recipientLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    recipientAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    recipientName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    recipientMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textMuted, marginTop: 22, marginBottom: 10 },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    chipText: { fontSize: 16, fontWeight: '700' },
    customAmountInput: { marginTop: 10, backgroundColor: COLORS.surfaceElevated, color: COLORS.text, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, fontSize: 16, fontWeight: '700' },
    sendBtn: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16 },
    sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    waitCol: { alignItems: 'center', paddingVertical: 10 },
    successIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    successTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
    successSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
    doneBtn: { marginTop: 20, width: '100%', alignItems: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: COLORS.primary },
    doneBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  }));

  if (!isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AirPay</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingTop: 20 }}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.warning} />
            <Text style={{ flex: 1, marginLeft: 10, color: COLORS.text, fontSize: 14 }}>
              Verify your account to use AirPay — this keeps proximity payments safe for everyone.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginHorizontal: 20, marginTop: 16 }]}
            onPress={() => navigation.navigate('VerifyAccount', { reason: 'AirPay requires a verified account' })}
          >
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Verify my account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const rendered = people.slice(0, MAX_RENDERED);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AirPay</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.visibilityRow}>
        <TouchableOpacity
          style={[styles.visibilityChip, { backgroundColor: visibility === 'contacts' ? COLORS.primary : 'transparent' }]}
          onPress={() => setVisibility('contacts')}
        >
          <Text style={[styles.visibilityChipText, { color: visibility === 'contacts' ? '#FFFFFF' : COLORS.textMuted }]}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.visibilityChip, { backgroundColor: visibility === 'everyone' ? COLORS.primary : 'transparent' }]}
          onPress={() => setVisibility('everyone')}
        >
          <Text style={[styles.visibilityChipText, { color: visibility === 'everyone' ? '#FFFFFF' : COLORS.textMuted }]}>Everyone Nearby</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.radiusRow}>
        <TouchableOpacity
          style={[styles.radiusBtn, radiusMeters <= RADIUS_MIN && styles.radiusBtnDisabled]}
          onPress={() => bumpRadius(-RADIUS_STEP)}
          disabled={radiusMeters <= RADIUS_MIN}
        >
          <Ionicons name="remove" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.radiusLabel}>{radiusMeters}m radius</Text>
        <TouchableOpacity
          style={[styles.radiusBtn, radiusMeters >= RADIUS_MAX && styles.radiusBtnDisabled]}
          onPress={() => bumpRadius(RADIUS_STEP)}
          disabled={radiusMeters >= RADIUS_MAX}
        >
          <Ionicons name="add" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.radiusCaption}>Discoverable within {radiusMeters}m</Text>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={COLORS.text} />
        </View>
      ) : needsLocation ? (
        <View style={styles.centerFill}>
          <Ionicons name="location-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Turn on location for AirPay</Text>
          <Text style={styles.emptyBody}>We use your device's location to find people near you to pay — nothing is shared until you pick someone.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleEnableLocation} disabled={locating}>
            {locating ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Enable location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <RadarBackdrop accent={accent} background={COLORS.background} mutedText={COLORS.textMuted}>
            {rendered.map((p) => {
              const radiusPx = Math.min(RING_MAX_PX, (p.distanceMeters / radiusMeters) * RING_MAX_PX);
              const angleRad = (p.bearingDeg * Math.PI) / 180;
              const x = RADAR_CENTER + radiusPx * Math.sin(angleRad);
              const y = RADAR_CENTER - radiusPx * Math.cos(angleRad);
              return (
                <RadarAvatar
                  key={p.id}
                  x={x}
                  y={y}
                  color={colorForId(p.id)}
                  initial={(p.displayName || p.username || '?').charAt(0).toUpperCase()}
                  onPress={() => openSheet(p)}
                  background={COLORS.background}
                  label={
                    <>
                      <View style={styles.personDistanceChip}>
                        <Text style={styles.personDistanceText}>{p.distanceMeters}m</Text>
                      </View>
                      <Text style={styles.personName} numberOfLines={1}>{p.displayName}</Text>
                    </>
                  }
                />
              );
            })}
          </RadarBackdrop>

          <Text style={styles.captionRow}>
            {people.length === 0
              ? visibility === 'contacts'
                ? 'No contacts nearby yet — try Everyone Nearby or widen your radius.'
                : 'No one nearby yet — try widening your radius.'
              : `${people.length} ${people.length === 1 ? 'person' : 'people'} nearby · tap an avatar to send`}
          </Text>
        </>
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeSheet}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.grabber} />

            {sentInfo ? (
              <View style={styles.waitCol}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={28} color="#07070C" />
                </View>
                <Text style={styles.successTitle}>Sent {sentInfo.amount} to {sentInfo.name}</Text>
                <Text style={styles.successSub}>Settled instantly on your Guranda wallet.</Text>
                <TouchableOpacity style={styles.doneBtn} onPress={doneAfterSend}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : selected ? (
              <View>
                <View style={styles.recipientRow}>
                  <View style={styles.recipientLeft}>
                    <View style={[styles.recipientAvatar, { backgroundColor: colorForId(selected.id) }]}>
                      <Text style={styles.personInitial}>{(selected.displayName || selected.username).charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.recipientName}>{selected.displayName}</Text>
                      <Text style={styles.recipientMeta}>Nearby · {selected.distanceMeters}m away</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={closeSheet} disabled={sending}>
                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Send amount</Text>
                <View style={styles.chipRow}>
                  {AMOUNT_CHIPS.map((v) => {
                    const active = amount === String(v);
                    return (
                      <TouchableOpacity
                        key={v}
                        style={[styles.chip, { backgroundColor: active ? COLORS.primary : COLORS.surfaceElevated, borderColor: active ? COLORS.primary : COLORS.border }]}
                        onPress={() => pickChip(v)}
                      >
                        <Text style={[styles.chipText, { color: active ? '#FFFFFF' : COLORS.textMuted }]}>R{v}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.customAmountInput}
                  placeholder="Or enter a custom amount"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(v) => { setAmount(v); setSendError(null); }}
                />

                {sendError ? (
                  <View style={[styles.infoCard, styles.errorCard, { marginHorizontal: 0 }]}>
                    <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
                    <Text style={{ flex: 1, marginLeft: 10, color: COLORS.error, fontSize: 14 }}>{sendError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: Number(amount) > 0 ? COLORS.primary : COLORS.surfaceElevated }]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  {sending ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Ionicons name="send" size={18} color="#FFFFFF" />
                      <Text style={styles.sendBtnText}>{Number(amount) > 0 ? `Send ${formatCurrency(Number(amount))}` : 'Choose an amount'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
