import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

// Adds real-world money onto the MSH ledger. No live PSP is wired in yet —
// requesting a deposit returns PayShap payment instructions against a
// reference, and the request sits PENDING until an admin confirms the money
// actually landed (mirrors how Stokvel contributions and other MSH-affecting
// actions in this app already work: real ledger state, manually confirmed).
export default function DepositScreen({ navigation }: any) {
  const { isVerified, refreshVerification } = useAuth();

  // AuthContext only refetches verification at login and on app-foreground —
  // an admin can approve it any time in between, so re-check on every visit
  // here too, or an already-verified account keeps seeing the "Verify my
  // account" gate until the next background/foreground cycle.
  useFocusEffect(useCallback(() => { refreshVerification(); }, [refreshVerification]));
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(() => {
    fetchApi('/wallets/deposits')
      .then(res => res.json())
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  if (!isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Deposit</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.form}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={20} color="#F59E0B" />
            <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]}>
              Verify your account to deposit money — this keeps the wallet safe for everyone.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('VerifyAccount', { reason: 'Depositing money requires a verified account' })}
          >
            <Ionicons name="shield-checkmark" size={20} color={COLORS.text} />
            <Text style={styles.actionButtonText}>Verify my account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleRequest = async () => {
    const value = parseFloat(amount);
    if (!(value > 0)) return;
    try {
      setSubmitting(true);
      const res = await fetchApi('/wallets/deposit', {
        method: 'POST',
        body: JSON.stringify({ amountZar: amount.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not start deposit');
      setPending(data);
      setAmount('');
      loadHistory();
    } catch {
      // Swallow — the info card stays hidden and the form stays editable,
      // which reads clearly enough as "that didn't go through, try again".
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistoryRow = ({ item }: { item: any }) => {
    const color = item.status === 'PAID' ? COLORS.success : item.status === 'REJECTED' ? COLORS.error : COLORS.warning;
    return (
      <View style={styles.historyRow}>
        <View>
          <Text style={TYPOGRAPHY.body1}>R{Number(item.amountZar).toFixed(2)} · {item.reference}</Text>
          <Text style={TYPOGRAPHY.body2}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={[TYPOGRAPHY.caption, { color }]}>{item.status}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Deposit</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={styles.form}>
            {pending ? (
              <View style={styles.instructionsCard}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[TYPOGRAPHY.body1, { fontWeight: '700', marginBottom: 4 }]}>Deposit started</Text>
                  <Text style={TYPOGRAPHY.body2}>{pending.instructions}</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.amountSection}>
                  <Text style={styles.currencyLabel}>ZAR</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.infoCard}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
                  <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]}>
                    Deposit via PayShap. You'll get a reference to pay against — your MSH balance updates once it's confirmed.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, submitting && styles.actionButtonDisabled]}
                  onPress={handleRequest}
                  disabled={submitting || !(parseFloat(amount) > 0)}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="arrow-down-circle" size={20} color={COLORS.text} />
                      <Text style={styles.actionButtonText}>Get PayShap reference</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {history.length > 0 && <Text style={[TYPOGRAPHY.h3, { marginTop: 28, marginBottom: 4 }]}>History</Text>}
          </View>
        }
        renderItem={renderHistoryRow}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ListEmptyComponent={!loadingHistory ? null : <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  backButton: { padding: 4 },
  form: { gap: 24 },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInput: {
    color: COLORS.secondary,
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 150,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 16,
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
