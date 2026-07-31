import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';
import { STOKVEL_CATEGORIES } from './FinanceHomeScreen';

const FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY'];

export default function CreateStokvelScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(STOKVEL_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('5');
  const [contributionFrequency, setContributionFrequency] = useState('MONTHLY');
  const [joiningFee, setJoiningFee] = useState('0');
  const [votingThresholdPct, setVotingThresholdPct] = useState('80');
  const [minMembers, setMinMembers] = useState('3');
  const [signerQuorum, setSignerQuorum] = useState('2');
  const [withdrawalRules, setWithdrawalRules] = useState('');
  const [fundingRules, setFundingRules] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Stokvel name is required'); return; }
    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) { setError('Contribution amount must be a positive number of XRP'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi('/finance/stokvels', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim() || undefined,
          contributionAmount: amount,
          contributionFrequency,
          joiningFee: parseFloat(joiningFee) || 0,
          votingThresholdPct: parseInt(votingThresholdPct, 10) || 80,
          minMembers: parseInt(minMembers, 10) || 3,
          signerQuorum: parseInt(signerQuorum, 10) || 2,
          withdrawalRules: withdrawalRules.trim() || undefined,
          fundingRules: fundingRules.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create stokvel');
      }
      const stokvel = await res.json();
      navigation.replace('StokvelDetail', { stokvelId: stokvel.id });
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a Stokvel</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Khaya Savings Circle" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {STOKVEL_CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)}>
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="What is this stokvel for?" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>

        <Text style={styles.sectionTitle}>CONTRIBUTION RULES</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Contribution (XRP) *</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="5" placeholderTextColor={COLORS.textMuted} value={contributionAmount} onChangeText={setContributionAmount} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Joining fee (XRP)</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} value={joiningFee} onChangeText={setJoiningFee} />
          </View>
        </View>

        <View>
          <Text style={styles.label}>Frequency</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FREQUENCIES.map(f => (
              <TouchableOpacity key={f} style={[styles.chip, contributionFrequency === f && styles.chipActive]} onPress={() => setContributionFrequency(f)}>
                <Text style={[styles.chipText, contributionFrequency === f && styles.chipTextActive]}>{f[0] + f.slice(1).toLowerCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>GOVERNANCE</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Voting threshold (%)</Text>
            <TextInput style={styles.input} keyboardType="number-pad" placeholder="80" placeholderTextColor={COLORS.textMuted} value={votingThresholdPct} onChangeText={setVotingThresholdPct} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Min. members</Text>
            <TextInput style={styles.input} keyboardType="number-pad" placeholder="3" placeholderTextColor={COLORS.textMuted} value={minMembers} onChangeText={setMinMembers} />
          </View>
        </View>

        <View>
          <Text style={styles.label}>Committee signatures required</Text>
          <TextInput style={styles.input} keyboardType="number-pad" placeholder="2" placeholderTextColor={COLORS.textMuted} value={signerQuorum} onChangeText={setSignerQuorum} />
          <Text style={styles.hint}>Your stokvel gets its own real XRPL multisig wallet. Once activated, no single person — including you — can move funds alone; this many committee members must sign together.</Text>
        </View>

        <View>
          <Text style={styles.label}>Withdrawal rules (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="e.g. Withdrawals only after 6 months of contributions" placeholderTextColor={COLORS.textMuted} value={withdrawalRules} onChangeText={setWithdrawalRules} multiline />
        </View>

        <View>
          <Text style={styles.label}>Funding rules (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="e.g. Business funding requests capped at 2x monthly pool" placeholderTextColor={COLORS.textMuted} value={fundingRules} onChangeText={setFundingRules} multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Stokvel</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: -8 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  hint: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  errorText: { color: '#ef4444', fontSize: 13 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: '#F59E0B', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
