import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { syncLocation } from '../utils/locationSync';
import { RADAR_CENTER, RING_MAX_PX, colorForId, RadarBackdrop, RadarAvatar } from '../components/ProximityRadar';
import { payshapBank } from '../config/payshapBanks';

type NearbyPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  distanceMeters: number;
  bearingDeg: number;
  payshapNumber: string;
  linkedBankIds: string[];
  primaryBankId: string | null;
};

const RADIUS_MIN = 20;
const RADIUS_MAX = 300;
const RADIUS_STEP = 20;
const DEFAULT_RADIUS = 60;
const POLL_INTERVAL_MS = 15_000;
const MAX_RENDERED = 12;
const AMOUNT_CHIPS = [10, 50, 100, 200];

export default function PayShapAirPayScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { isVerified, refreshVerification } = useAuth();

  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS);
  const [people, setPeople] = useState<NearbyPerson[]>([]);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<{ name: string; amount: string; bank: string } | null>(null);

  const didInitRef = useRef(false);

  const fetchNearby = useCallback(async (radius: number) => {
    try {
      const res = await fetchApi(`/payshap/airpay/nearby?radiusMeters=${radius}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) return;
      const data = await res.json();
      setNeedsLocation(!!data.needsLocation);
      setPeople(Array.isArray(data.people) ? data.people : []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { refreshVerification(); }, [refreshVerification]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncLocation().catch(() => {});
      if (cancelled) return;
      await fetchNearby(radiusMeters);
      if (!cancelled) { didInitRef.current = true; setLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didInitRef.current) return;
    const t = setTimeout(() => { fetchNearby(radiusMeters); }, 350);
    return () => clearTimeout(t);
  }, [radiusMeters, fetchNearby]);

  useFocusEffect(useCallback(() => {
    const id = setInterval(() => { fetchNearby(radiusMeters); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMeters]));

  const bumpRadius = (delta: number) => setRadiusMeters((r) => Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, r + delta)));

  const handleEnableLocation = async () => {
    setLocating(true);
    await syncLocation().catch(() => {});
    await fetchNearby(radiusMeters);
    setLocating(false);
  };

  const openSheet = (p: NearbyPerson) => {
    setSelected(p);
    setSelectedBankId(p.primaryBankId ?? p.linkedBankIds[0] ?? null);
    setAmount('');
    setSendError(null);
    setSentInfo(null);
  };
  const closeSheet = () => { if (!sending) setSelected(null); };

  const handleSend = async () => {
    if (!selected || !selectedBankId) return;
    const value = Number(amount);
    if (!(value > 0)) { setSendError('Enter a valid amount.'); return; }
    setSendError(null);
    setSending(true);
    try {
      const res = await fetchApi('/payshap/send', {
        method: 'POST',
        body: JSON.stringify({ number: selected.payshapNumber, bankId: selectedBankId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');
      setSentInfo({ name: selected.displayName, amount: formatCurrency(value), bank: payshapBank(selectedBankId)?.name ?? '' });
    } catch (e: any) {
      setSendError(e.message || 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  const doneAfterSend = () => {
    setSentInfo(null);
    setSelected(null);
    fetchNearby(radiusMeters);
  };

  const accent = COLORS.primary;

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    radiusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 4 },
    radiusBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    radiusBtnDisabled: { opacity: 0.35 },
    radiusLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, minWidth: 96, textAlign: 'center' },
    radiusCaption: { textAlign: 'center', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginTop: 6 },
    personLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text },
    personSub: { fontSize: 9, color: COLORS.textMuted },
    captionRow: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, marginTop: 6, paddingHorizontal: SPACING.lg },
    centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 14 },
    emptyTitle: { ...TYPOGRAPHY.h3, textAlign: 'center' },
    emptyBody: { ...TYPOGRAPHY.body2, textAlign: 'center' },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 14, borderRadius: RADIUS.md },
    primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: SPACING.lg },
    errorCard: { borderColor: COLORS.error, marginTop: 12 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '75%' },
    grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 18 },
    recipientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    recipientLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    recipientAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    personInitial: { fontSize: 16, fontWeight: '800', color: '#07070C' },
    recipientName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    recipientMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textMuted, marginTop: 22, marginBottom: 10 },
    bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, marginBottom: 8 },
    bankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bankBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    bankBadgeText: { fontSize: 10, fontWeight: '800', color: '#07070C' },
    bankName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    chipText: { fontSize: 16, fontWeight: '700' },
    sendBtn: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16 },
    sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
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
          <Text style={styles.headerTitle}>PayShap AirPay</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingTop: 20 }}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.warning} />
            <Text style={{ flex: 1, marginLeft: 10, color: COLORS.text, fontSize: 14 }}>Verify your account to use PayShap AirPay.</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginHorizontal: 20, marginTop: 16 }]}
            onPress={() => navigation.navigate('VerifyAccount', { reason: 'PayShap AirPay requires a verified account' })}
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
        <Text style={styles.headerTitle}>PayShap AirPay</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.radiusRow}>
        <TouchableOpacity style={[styles.radiusBtn, radiusMeters <= RADIUS_MIN && styles.radiusBtnDisabled]} onPress={() => bumpRadius(-RADIUS_STEP)} disabled={radiusMeters <= RADIUS_MIN}>
          <Ionicons name="remove" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.radiusLabel}>{radiusMeters}m radius</Text>
        <TouchableOpacity style={[styles.radiusBtn, radiusMeters >= RADIUS_MAX && styles.radiusBtnDisabled]} onPress={() => bumpRadius(RADIUS_STEP)} disabled={radiusMeters >= RADIUS_MAX}>
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
          <Text style={styles.emptyTitle}>Turn on location for PayShap AirPay</Text>
          <Text style={styles.emptyBody}>We use your device's location to find people near you who are payable via PayShap.</Text>
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
              const primary = payshapBank(p.primaryBankId);
              return (
                <RadarAvatar
                  key={p.id}
                  x={x}
                  y={y}
                  color={colorForId(p.id)}
                  initial={(p.displayName || p.username || '?').charAt(0).toUpperCase()}
                  onPress={() => openSheet(p)}
                  background={COLORS.background}
                  badgeColor={primary?.color}
                  badgeCode={primary?.code}
                  label={
                    <>
                      <Text style={styles.personLabel} numberOfLines={1}>{p.displayName}</Text>
                      <Text style={styles.personSub} numberOfLines={1}>{p.distanceMeters}m{primary ? ` · ${primary.name}` : ''}</Text>
                    </>
                  }
                />
              );
            })}
          </RadarBackdrop>

          <Text style={styles.captionRow}>
            {people.length === 0
              ? 'No one payable via PayShap nearby yet — try widening your radius.'
              : `${people.length} ${people.length === 1 ? 'person' : 'people'} nearby · tap to pay via PayShap`}
          </Text>
        </>
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeSheet}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.grabber} />

            {sentInfo ? (
              <View style={{ alignItems: 'center' }}>
                <View style={styles.successIcon}><Ionicons name="checkmark" size={28} color="#07070C" /></View>
                <Text style={styles.successTitle}>Sent {sentInfo.amount} to {sentInfo.name}</Text>
                <Text style={styles.successSub}>via {sentInfo.bank} · PayShap</Text>
                <TouchableOpacity style={styles.doneBtn} onPress={doneAfterSend}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : selected ? (
              <View>
                <View style={styles.recipientRow}>
                  <View style={styles.recipientLeft}>
                    <View style={[styles.recipientAvatar, { backgroundColor: colorForId(selected.id) }]}>
                      <Text style={styles.personInitial}>{selected.displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.recipientName}>{selected.displayName}</Text>
                      <Text style={styles.recipientMeta}>Nearby · {selected.distanceMeters}m</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={closeSheet} disabled={sending}>
                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Choose where to pay</Text>
                {selected.linkedBankIds.map((id) => {
                  const b = payshapBank(id);
                  if (!b) return null;
                  const isSel = id === selectedBankId;
                  return (
                    <TouchableOpacity key={id} style={[styles.bankRow, { backgroundColor: isSel ? COLORS.surfaceElevated : 'transparent', borderWidth: 1, borderColor: isSel ? COLORS.success : COLORS.border }]} onPress={() => setSelectedBankId(id)}>
                      <View style={styles.bankLeft}>
                        <View style={[styles.bankBadge, { backgroundColor: b.color }]}><Text style={styles.bankBadgeText}>{b.code}</Text></View>
                        <Text style={styles.bankName}>{b.name}</Text>
                      </View>
                      {isSel ? <Ionicons name="checkmark" size={18} color={COLORS.success} /> : null}
                    </TouchableOpacity>
                  );
                })}

                <Text style={styles.sectionLabel}>Send amount</Text>
                <View style={styles.chipRow}>
                  {AMOUNT_CHIPS.map((v) => {
                    const active = amount === String(v);
                    return (
                      <TouchableOpacity key={v} style={[styles.chip, { backgroundColor: active ? COLORS.primary : COLORS.surfaceElevated, borderColor: active ? COLORS.primary : COLORS.border }]} onPress={() => { setAmount(String(v)); setSendError(null); }}>
                        <Text style={[styles.chipText, { color: active ? '#FFFFFF' : COLORS.textMuted }]}>R{v}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {sendError ? (
                  <View style={[styles.infoCard, styles.errorCard, { marginHorizontal: 0, marginTop: 12 }]}>
                    <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
                    <Text style={{ flex: 1, marginLeft: 10, color: COLORS.error, fontSize: 14 }}>{sendError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: Number(amount) > 0 && selectedBankId ? COLORS.primary : COLORS.surfaceElevated }]}
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
