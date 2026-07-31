import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';

export default function CreateFundingRequestScreen({ route, navigation }: any) {
  const { stokvelId } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountXrp, setAmountXrp] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const amount = parseFloat(amountXrp);
    if (!title.trim() || !amount || amount <= 0) { setError('Title and a positive XRP amount are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi(`/finance/stokvels/${stokvelId}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          amountXrp: amount,
          recipientAddress: recipientAddress.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit request');
      }
      const request = await res.json();
      navigation.replace('FundingRequestDetail', { requestId: request.id });
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
        <Text style={styles.headerTitle}>New Funding Request</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Business funding request" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
        </View>

        <View>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 100 }]} placeholder="What is this money for?" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />
        </View>

        <View>
          <Text style={styles.label}>Amount (XRP) *</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="8" placeholderTextColor={COLORS.textMuted} value={amountXrp} onChangeText={setAmountXrp} />
        </View>

        <View>
          <Text style={styles.label}>Recipient XRPL address (optional)</Text>
          <TextInput style={styles.input} placeholder="Defaults to your own wallet" placeholderTextColor={COLORS.textMuted} value={recipientAddress} onChangeText={setRecipientAddress} autoCapitalize="none" />
        </View>

        <Text style={styles.hint}>Members vote to approve. Once the stokvel's voting threshold is reached, committee members sign and the real XRPL payment is released from the stokvel wallet.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Submit Request</Text>}
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
  input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
  hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  errorText: { color: '#ef4444', fontSize: 13 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: '#F59E0B', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
