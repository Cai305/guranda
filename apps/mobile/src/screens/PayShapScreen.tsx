import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';
import { payshapBank } from '../config/payshapBanks';

type LookupResult = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  linkedBankIds: string[];
  primaryBankId: string | null;
};

const AMOUNT_CHIPS = [10, 50, 100, 200];

// A small deterministic dot pattern — purely decorative, never claimed to be
// a real scannable code (mirrors the design canvas's own QR placeholder).
function buildQrCells(seedStart: number) {
  const cells: { x: number; y: number }[] = [];
  let seed = seedStart;
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 12; col++) {
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 > 0.52) cells.push({ x: col * 12 + 3, y: row * 12 + 3 });
    }
  }
  return cells;
}

export default function PayShapScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { isVerified, refreshVerification } = useAuth();

  const [tab, setTab] = useState<'send' | 'request' | 'receive'>('send');

  const [myNumber, setMyNumber] = useState('');
  const [myBankIds, setMyBankIds] = useState<string[]>([]);
  const [myPrimaryId, setMyPrimaryId] = useState<string | null>(null);

  // Send
  const [numberInput, setNumberInput] = useState('');
  const [sendStep, setSendStep] = useState<'enter' | 'picking' | 'amount' | 'success'>('enter');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<LookupResult | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<{ name: string; amount: string; bank: string } | null>(null);

  // Request
  const [reqNumberInput, setReqNumberInput] = useState('');
  const [reqStep, setReqStep] = useState<'enter' | 'amount' | 'success'>('enter');
  const [reqLookupBusy, setReqLookupBusy] = useState(false);
  const [reqLookupError, setReqLookupError] = useState<string | null>(null);
  const [reqPayer, setReqPayer] = useState<LookupResult | null>(null);
  const [reqAmount, setReqAmount] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [reqSending, setReqSending] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqCreated, setReqCreated] = useState(false);

  useFocusEffect(useCallback(() => { refreshVerification(); }, [refreshVerification]));

  const loadMyProfile = useCallback(async () => {
    try {
      const res = await fetchApi('/payshap/me', { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) return;
      const data = await res.json();
      setMyNumber(data.number ?? '');
      setMyBankIds(data.linkedBankIds ?? []);
      setMyPrimaryId(data.primaryBankId ?? null);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { loadMyProfile(); }, [loadMyProfile]));

  const qrCells = useMemo(() => buildQrCells(7), []);

  // --- Send ---
  const lookupSend = async () => {
    if (!numberInput.trim()) return;
    setLookupBusy(true);
    setLookupError(null);
    try {
      const res = await fetchApi(`/payshap/lookup?number=${encodeURIComponent(numberInput.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No payable PayShap account found for that number');
      setRecipient(data);
      setSelectedBankId(data.primaryBankId ?? data.linkedBankIds[0] ?? null);
      setSendStep('picking');
    } catch (e: any) {
      setLookupError(e.message);
    } finally {
      setLookupBusy(false);
    }
  };

  const backToEnter = () => { setSendStep('enter'); setRecipient(null); setSelectedBankId(null); };
  const backToPicking = () => setSendStep('picking');

  const continueToAmount = () => {
    if (!selectedBankId) return;
    setSendStep('amount');
  };

  const handleSend = async () => {
    if (!recipient || !selectedBankId) return;
    const value = Number(amount);
    if (!(value > 0)) { setSendError('Enter a valid amount.'); return; }
    setSendError(null);
    setSending(true);
    try {
      const res = await fetchApi('/payshap/send', {
        method: 'POST',
        body: JSON.stringify({ number: numberInput.trim(), bankId: selectedBankId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');
      setSentInfo({ name: recipient.displayName, amount: formatCurrency(value), bank: payshapBank(selectedBankId)?.name ?? '' });
      setSendStep('success');
    } catch (e: any) {
      setSendError(e.message || 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  const resetSend = () => {
    setNumberInput(''); setSendStep('enter'); setRecipient(null); setSelectedBankId(null);
    setAmount(''); setSendError(null); setSentInfo(null); setLookupError(null);
  };

  // --- Request ---
  const lookupRequest = async () => {
    if (!reqNumberInput.trim()) return;
    setReqLookupBusy(true);
    setReqLookupError(null);
    try {
      const res = await fetchApi(`/payshap/lookup?number=${encodeURIComponent(reqNumberInput.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No payable PayShap account found for that number');
      setReqPayer(data);
      setReqStep('amount');
    } catch (e: any) {
      setReqLookupError(e.message);
    } finally {
      setReqLookupBusy(false);
    }
  };

  const createRequest = async () => {
    if (!reqPayer) return;
    const value = Number(reqAmount);
    if (!(value > 0)) { setReqError('Enter a valid amount.'); return; }
    setReqError(null);
    setReqSending(true);
    try {
      const res = await fetchApi('/payshap/request', {
        method: 'POST',
        body: JSON.stringify({ number: reqNumberInput.trim(), amount: reqAmount, memo: reqNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create that request');
      setReqCreated(true);
    } catch (e: any) {
      setReqError(e.message || 'Could not create that request');
    } finally {
      setReqSending(false);
    }
  };

  const resetRequest = () => {
    setReqNumberInput(''); setReqStep('enter'); setReqPayer(null); setReqAmount('');
    setReqNote(''); setReqError(null); setReqCreated(false); setReqLookupError(null);
  };

  const switchTab = (next: 'send' | 'request' | 'receive') => {
    if (tab === 'send' && next !== 'send') resetSend();
    if (tab === 'request' && next !== 'request') resetRequest();
    setTab(next);
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    tabRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, padding: 4, gap: 4 },
    tabChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
    tabChipText: { fontSize: 13, fontWeight: '700' },
    body: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, flex: 1 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    backRowText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 },
    numberField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16 },
    numberFieldInput: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '600' },
    primaryBtn: { marginTop: 16, alignItems: 'center', padding: 16, borderRadius: RADIUS.md },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginTop: 22 },
    infoText: { flex: 1, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
    errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.error, borderRadius: 14, padding: 14, marginTop: 14 },
    errorText: { flex: 1, fontSize: 13, color: COLORS.error },
    recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
    recipientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    recipientInitial: { fontSize: 16, fontWeight: '800', color: '#fff' },
    recipientName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    recipientMeta: { fontSize: 12, color: COLORS.textMuted },
    bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, marginTop: 8 },
    bankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bankBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    bankBadgeText: { fontSize: 10, fontWeight: '800', color: '#07070C' },
    bankName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    contextRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12 },
    contextText: { fontSize: 13, color: COLORS.textMuted },
    amountBox: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 16 },
    amountLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    amountValue: { fontSize: 48, fontWeight: '700', color: COLORS.secondary },
    chipRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    chip: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
    chipText: { fontSize: 16, fontWeight: '700' },
    noteInput: { marginTop: 14, height: 64, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, color: COLORS.text, fontSize: 14, padding: 14, textAlignVertical: 'top' as const },
    successWrap: { alignItems: 'center', paddingTop: 50 },
    successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    successTitle: { fontSize: 19, fontWeight: '700', color: COLORS.text, textAlign: 'center' as const },
    successSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
    requestCard: { width: '100%' as const, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginTop: 20 },
    requestCardNumber: { fontSize: 12, color: COLORS.textMuted },
    requestCardAmount: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 2 },
    requestCardNote: { fontSize: 13, color: COLORS.text, marginTop: 6, fontStyle: 'italic' as const },
    shareBtn: { marginTop: 16, width: '100%' as const, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16 },
    shareBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    createAnotherText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' as const, marginTop: 10, padding: 12 },
    qrWrap: { alignItems: 'center' },
    qrBox: { width: 200, height: 200, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
    scanLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 16 },
    numberDisplay: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 4, letterSpacing: -0.3 },
    paysIntoLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginTop: 24, marginBottom: 10, alignSelf: 'flex-start' as const },
  }));

  if (!isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PayShap</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.body}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.warning} />
            <Text style={styles.infoText}>Verify your account to use PayShap — this keeps proximity and number-based payments safe for everyone.</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
            onPress={() => navigation.navigate('VerifyAccount', { reason: 'PayShap requires a verified account' })}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Verify my account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PayShap</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('PayShapLink')}>
          <Ionicons name="settings-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(['send', 'request', 'receive'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabChip, { backgroundColor: tab === t ? COLORS.primary : 'transparent' }]} onPress={() => switchTab(t)}>
            <Text style={[styles.tabChipText, { color: tab === t ? '#fff' : COLORS.textMuted }]}>{t === 'send' ? 'Send' : t === 'request' ? 'Request' : 'Receive'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.body}>
        {tab === 'send' && sendStep === 'enter' && (
          <View>
            <Text style={styles.fieldLabel}>PAYSHAP NUMBER</Text>
            <View style={styles.numberField}>
              <Ionicons name="call-outline" size={18} color={COLORS.textMuted} />
              <TextInput style={styles.numberFieldInput} value={numberInput} onChangeText={setNumberInput} placeholder="+27 71 000 0000" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" />
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: numberInput.trim() ? COLORS.primary : COLORS.surfaceElevated }]} onPress={lookupSend} disabled={lookupBusy}>
              {lookupBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Look up</Text>}
            </TouchableOpacity>
            {lookupError ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{lookupError}</Text>
              </View>
            ) : null}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.infoText}>We'll show you exactly who this number belongs to before you send anything — same safety check as a real PayShap transfer.</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('PayShapAirPay')}>
              <Text style={[styles.createAnotherText, { color: COLORS.primary }]}>Or find someone nearby via PayShap AirPay →</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'send' && sendStep === 'picking' && recipient && (
          <View>
            <TouchableOpacity style={styles.backRow} onPress={backToEnter}>
              <Ionicons name="chevron-back" size={16} color={COLORS.textMuted} />
              <Text style={styles.backRowText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.recipientRow}>
              <View style={styles.recipientAvatar}><Text style={styles.recipientInitial}>{recipient.displayName.charAt(0).toUpperCase()}</Text></View>
              <View>
                <Text style={styles.recipientName}>{recipient.displayName}</Text>
                <Text style={styles.recipientMeta}>{numberInput.trim()}</Text>
              </View>
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>CHOOSE WHERE TO SEND</Text>
            {recipient.linkedBankIds.map((id) => {
              const b = payshapBank(id);
              if (!b) return null;
              const selected = id === selectedBankId;
              return (
                <TouchableOpacity key={id} style={[styles.bankRow, { backgroundColor: selected ? COLORS.surfaceElevated : 'transparent', borderWidth: 1, borderColor: selected ? COLORS.success : COLORS.border }]} onPress={() => setSelectedBankId(id)}>
                  <View style={styles.bankLeft}>
                    <View style={[styles.bankBadge, { backgroundColor: b.color }]}><Text style={styles.bankBadgeText}>{b.code}</Text></View>
                    <Text style={styles.bankName}>{b.name}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark" size={18} color={COLORS.success} /> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: selectedBankId ? COLORS.primary : COLORS.surfaceElevated }]} onPress={continueToAmount}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'send' && sendStep === 'amount' && recipient && (
          <View>
            <TouchableOpacity style={styles.backRow} onPress={backToPicking}>
              <Ionicons name="chevron-back" size={16} color={COLORS.textMuted} />
              <Text style={styles.backRowText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.contextRow}>
              <View style={[styles.bankBadge, { width: 30, height: 30, backgroundColor: payshapBank(selectedBankId)?.color }]}>
                <Text style={[styles.bankBadgeText, { fontSize: 9 }]}>{payshapBank(selectedBankId)?.code}</Text>
              </View>
              <Text style={styles.contextText}>Sending to <Text style={{ color: COLORS.text, fontWeight: '700' }}>{recipient.displayName}</Text> · {payshapBank(selectedBankId)?.name}</Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>R</Text>
              <Text style={styles.amountValue}>{amount || '0'}</Text>
            </View>
            <View style={styles.chipRow}>
              {AMOUNT_CHIPS.map((v) => {
                const active = amount === String(v);
                return (
                  <TouchableOpacity key={v} style={[styles.chip, { backgroundColor: active ? COLORS.primary : COLORS.surfaceElevated, borderColor: active ? COLORS.primary : COLORS.border }]} onPress={() => { setAmount(String(v)); setSendError(null); }}>
                    <Text style={[styles.chipText, { color: active ? '#fff' : COLORS.textMuted }]}>R{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {sendError ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{sendError}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Number(amount) > 0 ? COLORS.primary : COLORS.surfaceElevated }]} onPress={handleSend} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{Number(amount) > 0 ? `Send ${formatCurrency(Number(amount))}` : 'Choose an amount'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {tab === 'send' && sendStep === 'success' && sentInfo && (
          <View style={styles.successWrap}>
            <View style={styles.successIcon}><Ionicons name="checkmark" size={30} color="#07070C" /></View>
            <Text style={styles.successTitle}>Sent {sentInfo.amount} to {sentInfo.name}</Text>
            <Text style={styles.successSub}>via {sentInfo.bank} · PayShap</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.primary, width: '100%' }]} onPress={resetSend}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'request' && !reqCreated && reqStep === 'enter' && (
          <View>
            <Text style={styles.fieldLabel}>REQUEST FROM</Text>
            <View style={styles.numberField}>
              <Ionicons name="call-outline" size={18} color={COLORS.textMuted} />
              <TextInput style={styles.numberFieldInput} value={reqNumberInput} onChangeText={setReqNumberInput} placeholder="+27 71 000 0000" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" />
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: reqNumberInput.trim() ? COLORS.primary : COLORS.surfaceElevated }]} onPress={lookupRequest} disabled={reqLookupBusy}>
              {reqLookupBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Look up</Text>}
            </TouchableOpacity>
            {reqLookupError ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{reqLookupError}</Text>
              </View>
            ) : null}
          </View>
        )}

        {tab === 'request' && !reqCreated && reqStep === 'amount' && reqPayer && (
          <View>
            <TouchableOpacity style={styles.backRow} onPress={() => { setReqStep('enter'); setReqPayer(null); }}>
              <Ionicons name="chevron-back" size={16} color={COLORS.textMuted} />
              <Text style={styles.backRowText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.recipientRow}>
              <View style={styles.recipientAvatar}><Text style={styles.recipientInitial}>{reqPayer.displayName.charAt(0).toUpperCase()}</Text></View>
              <View>
                <Text style={styles.recipientName}>{reqPayer.displayName}</Text>
                <Text style={styles.recipientMeta}>{reqNumberInput.trim()}</Text>
              </View>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>R</Text>
              <Text style={styles.amountValue}>{reqAmount || '0'}</Text>
            </View>
            <View style={styles.chipRow}>
              {AMOUNT_CHIPS.map((v) => {
                const active = reqAmount === String(v);
                return (
                  <TouchableOpacity key={v} style={[styles.chip, { backgroundColor: active ? COLORS.primary : COLORS.surfaceElevated, borderColor: active ? COLORS.primary : COLORS.border }]} onPress={() => { setReqAmount(String(v)); setReqError(null); }}>
                    <Text style={[styles.chipText, { color: active ? '#fff' : COLORS.textMuted }]}>R{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput style={styles.noteInput} value={reqNote} onChangeText={setReqNote} placeholder="Add a note (optional)" placeholderTextColor={COLORS.textMuted} multiline />
            {reqError ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{reqError}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Number(reqAmount) > 0 ? COLORS.primary : COLORS.surfaceElevated }]} onPress={createRequest} disabled={reqSending}>
              {reqSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create request</Text>}
            </TouchableOpacity>
          </View>
        )}

        {tab === 'request' && reqCreated && reqPayer && (
          <View style={styles.successWrap}>
            <View style={styles.successIcon}><Ionicons name="checkmark" size={28} color="#07070C" /></View>
            <Text style={styles.successTitle}>Requested {formatCurrency(Number(reqAmount))} from {reqPayer.displayName}</Text>
            <Text style={styles.successSub}>They'll see it under Payment Requests.</Text>
            <View style={styles.requestCard}>
              <Text style={styles.requestCardNumber}>{myNumber || 'You'} requested</Text>
              <Text style={styles.requestCardAmount}>{formatCurrency(Number(reqAmount))}</Text>
              {reqNote.trim() ? <Text style={styles.requestCardNote}>"{reqNote.trim()}"</Text> : null}
            </View>
            <TouchableOpacity onPress={resetRequest}>
              <Text style={styles.createAnotherText}>Create another</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'receive' && (
          <View style={styles.qrWrap}>
            <View style={styles.qrBox}>
              <Svg width={150} height={150} viewBox="0 0 150 150" fill="#07070C">
                {qrCells.map((c, i) => <Rect key={i} x={c.x} y={c.y} width={9} height={9} />)}
              </Svg>
            </View>
            <Text style={styles.scanLabel}>SCAN OR SHARE</Text>
            <Text style={styles.numberDisplay}>{myNumber || 'No number set'}</Text>

            <Text style={styles.paysIntoLabel}>PAYS INTO</Text>
            {myBankIds.map((id) => {
              const b = payshapBank(id);
              if (!b) return null;
              return (
                <View key={id} style={[styles.bankRow, { width: '100%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }]}>
                  <View style={styles.bankLeft}>
                    <View style={[styles.bankBadge, { backgroundColor: b.color }]}><Text style={styles.bankBadgeText}>{b.code}</Text></View>
                    <Text style={styles.bankName}>{b.name}</Text>
                  </View>
                  {id === myPrimaryId ? <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.success }}>PRIMARY</Text> : null}
                </View>
              );
            })}
            {myBankIds.length === 0 ? (
              <TouchableOpacity onPress={() => navigation.navigate('PayShapLink')}>
                <Text style={[styles.createAnotherText, { color: COLORS.primary }]}>Link a bank to become payable →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
