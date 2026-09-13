import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { PAYSHAP_BANKS, payshapBank } from '../config/payshapBanks';

export default function PayShapLinkScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;

  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState('');
  const [savedNumber, setSavedNumber] = useState('');
  const [savingNumber, setSavingNumber] = useState(false);
  const [linkedBankIds, setLinkedBankIds] = useState<string[]>([]);
  const [primaryBankId, setPrimaryBankId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyBankId, setBusyBankId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/payshap/me', { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) return;
      const data = await res.json();
      setNumber(data.number ?? '');
      setSavedNumber(data.number ?? '');
      setLinkedBankIds(data.linkedBankIds ?? []);
      setPrimaryBankId(data.primaryBankId ?? null);
    } catch {
      // best-effort — screen just shows whatever it last had
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveNumber = async () => {
    if (number.trim() === savedNumber || !number.trim()) return;
    setSavingNumber(true);
    try {
      const res = await fetchApi('/payshap/number', { method: 'POST', body: JSON.stringify({ number: number.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save that number');
      setNumber(data.number);
      setSavedNumber(data.number);
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
      setNumber(savedNumber);
    } finally {
      setSavingNumber(false);
    }
  };

  const setPrimary = async (bankId: string) => {
    setBusyBankId(bankId);
    const prevPrimary = primaryBankId;
    setPrimaryBankId(bankId);
    try {
      const res = await fetchApi(`/payshap/banks/${bankId}/primary`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
    } catch {
      setPrimaryBankId(prevPrimary);
    } finally {
      setBusyBankId(null);
    }
  };

  const unlink = async (bankId: string) => {
    setBusyBankId(bankId);
    const prevLinked = linkedBankIds;
    const prevPrimary = primaryBankId;
    const nextLinked = linkedBankIds.filter((b) => b !== bankId);
    setLinkedBankIds(nextLinked);
    if (primaryBankId === bankId) setPrimaryBankId(nextLinked[0] ?? null);
    try {
      const res = await fetchApi(`/payshap/banks/${bankId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLinkedBankIds(data.linkedBankIds);
      setPrimaryBankId(data.primaryBankId);
    } catch {
      setLinkedBankIds(prevLinked);
      setPrimaryBankId(prevPrimary);
    } finally {
      setBusyBankId(null);
    }
  };

  const toggleLink = async (bankId: string) => {
    const isLinked = linkedBankIds.includes(bankId);
    if (isLinked) { await unlink(bankId); return; }
    setBusyBankId(bankId);
    const prevLinked = linkedBankIds;
    const prevPrimary = primaryBankId;
    setLinkedBankIds((prev) => [...prev, bankId]);
    if (!primaryBankId) setPrimaryBankId(bankId);
    try {
      const res = await fetchApi('/payshap/banks', { method: 'POST', body: JSON.stringify({ bankId }) });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLinkedBankIds(data.linkedBankIds);
      setPrimaryBankId(data.primaryBankId);
    } catch {
      setLinkedBankIds(prevLinked);
      setPrimaryBankId(prevPrimary);
    } finally {
      setBusyBankId(null);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
    body: { paddingHorizontal: SPACING.lg },
    numberCard: { marginTop: 12, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
    numberLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.65)' },
    numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    numberInput: { flex: 1, color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3, padding: 0 },
    saveChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    saveChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    numberHint: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xl },
    sectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, color: COLORS.textMuted },
    sectionCount: { fontSize: 12, color: COLORS.textMuted },
    bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginTop: 8 },
    bankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bankBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    bankBadgeText: { fontSize: 11, fontWeight: '800', color: '#07070C' },
    bankName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    primaryTag: { fontSize: 11, fontWeight: '700', color: COLORS.success, marginTop: 2 },
    setPrimaryTag: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
    removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    addBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#33334A', borderStyle: 'dashed' as const },
    addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
    explainerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginTop: SPACING.xl, marginBottom: 24 },
    explainerText: { flex: 1, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '75%' },
    grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    sheetSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, marginBottom: 8 },
    doneBtn: { marginTop: 10, textAlign: 'center' as const, padding: 16, borderRadius: 16, backgroundColor: COLORS.primary },
    doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' as const },
  }));

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.text} />
      </SafeAreaView>
    );
  }

  const linkedBanks = linkedBankIds.map((id) => payshapBank(id)).filter(Boolean) as typeof PAYSHAP_BANKS;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PayShap</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={[styles.numberCard, { backgroundColor: '#7C3AED' }]}>
          <Text style={styles.numberLabel}>YOUR PAYSHAP NUMBER</Text>
          <View style={styles.numberRow}>
            <Ionicons name="call-outline" size={18} color="#fff" />
            <TextInput
              style={styles.numberInput}
              value={number}
              onChangeText={setNumber}
              onBlur={saveNumber}
              onSubmitEditing={saveNumber}
              placeholder="+27 82 000 0000"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="phone-pad"
            />
            {savingNumber ? <ActivityIndicator color="#fff" size="small" /> : number.trim() !== savedNumber && number.trim() ? (
              <TouchableOpacity style={styles.saveChip} onPress={saveNumber}>
                <Text style={styles.saveChipText}>Save</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.numberHint}>This is the number people pay — Guranda routes it to whichever bank you pick below.</Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>LINKED BANKS</Text>
          <Text style={styles.sectionCount}>{linkedBanks.length} linked</Text>
        </View>

        {linkedBanks.map((b) => (
          <View key={b.id} style={styles.bankRow}>
            <View style={styles.bankLeft}>
              <View style={[styles.bankBadge, { backgroundColor: b.color }]}>
                <Text style={styles.bankBadgeText}>{b.code}</Text>
              </View>
              <View>
                <Text style={styles.bankName}>{b.name}</Text>
                {b.id === primaryBankId ? (
                  <Text style={styles.primaryTag}>PRIMARY · receives by default</Text>
                ) : (
                  <TouchableOpacity onPress={() => setPrimary(b.id)} disabled={busyBankId === b.id}>
                    <Text style={styles.setPrimaryTag}>Set as primary</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => unlink(b.id)} disabled={busyBankId === b.id}>
              {busyBankId === b.id ? <ActivityIndicator size="small" color={COLORS.textMuted} /> : (
                <Ionicons name="close" size={14} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)}>
          <Ionicons name="add" size={16} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Link another bank</Text>
        </TouchableOpacity>

        <View style={styles.explainerCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.explainerText}>
            {linkedBanks.length === 0
              ? `${number || 'Your number'} isn't payable yet — link at least one bank above so people can pay it.`
              : `Anyone who pays ${number} on PayShap sees every bank you've linked and picks one — your ${linkedBanks.length} linked bank${linkedBanks.length === 1 ? '' : 's'} all stay reachable from this one number.`}
          </Text>
        </View>
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Link a bank</Text>
            <Text style={styles.sheetSub}>Tap a bank to link or unlink it from your PayShap number.</Text>
            {PAYSHAP_BANKS.map((b) => {
              const linked = linkedBankIds.includes(b.id);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.pickerRow, { backgroundColor: linked ? COLORS.surfaceElevated : 'transparent', borderWidth: 1, borderColor: linked ? COLORS.success : COLORS.border }]}
                  onPress={() => toggleLink(b.id)}
                  disabled={busyBankId === b.id}
                >
                  <View style={styles.bankLeft}>
                    <View style={[styles.bankBadge, { width: 36, height: 36, backgroundColor: b.color }]}>
                      <Text style={styles.bankBadgeText}>{b.code}</Text>
                    </View>
                    <Text style={styles.bankName}>{b.name}</Text>
                  </View>
                  {busyBankId === b.id ? <ActivityIndicator size="small" color={COLORS.textMuted} /> : linked ? (
                    <Ionicons name="checkmark" size={18} color={COLORS.success} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.doneBtn} onPress={() => setPickerOpen(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
