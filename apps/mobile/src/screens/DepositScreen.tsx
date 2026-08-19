import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';

// Adds real-world money onto the MSH ledger. No live PSP is wired in yet —
// requesting a deposit returns PayShap payment instructions against a
// reference, and the request sits PENDING until an admin confirms the money
// actually landed (mirrors how Stokvel contributions and other MSH-affecting
// actions in this app already work: real ledger state, manually confirmed).
export default function DepositScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { isVerified, refreshVerification } = useAuth();

  // AuthContext only refetches verification at login and on app-foreground —
  // an admin can approve it any time in between, so re-check on every visit
  // here too, or an already-verified account keeps seeing the "Verify my
  // account" gate until the next background/foreground cycle.
  useFocusEffect(useCallback(() => { refreshVerification(); }, [refreshVerification]));
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
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

  const styles = useThemedStyles(({ COLORS }) => ({
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
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    reviewSheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    reviewTitle: {
      color: COLORS.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    reviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    reviewRowLast: {
      borderBottomWidth: 0,
      marginBottom: 6,
    },
    reviewKey: { color: COLORS.textMuted, fontSize: 14 },
    reviewVal: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  }));

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
    setReviewing(false);
    setRequestError(null);
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
    } catch (e: any) {
      setRequestError(e.message || "Couldn't start the deposit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistoryRow = ({ item }: { item: any }) => {
    const color = item.status === 'PAID' ? COLORS.success : item.status === 'REJECTED' ? COLORS.error : COLORS.warning;
    return (
      <View style={styles.historyRow}>
        <View>
          <Text style={TYPOGRAPHY.body1}>{formatCurrency(Number(item.amountZar))} · {item.reference}</Text>
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
                  <Text style={styles.currencyLabel}>R</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>

                {requestError && (
                  <View style={[styles.infoCard, { borderColor: COLORS.error }]}>
                    <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
                    <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10, color: COLORS.error }]}>{requestError}</Text>
                  </View>
                )}

                <View style={styles.infoCard}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
                  <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]}>
                    Deposit via PayShap. You'll get a reference to pay against — your MSH balance updates once it's confirmed.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, submitting && styles.actionButtonDisabled]}
                  onPress={() => { setRequestError(null); setReviewing(true); }}
                  disabled={submitting || !(parseFloat(amount) > 0)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-down-circle" size={20} color={COLORS.text} />
                  <Text style={styles.actionButtonText}>Review deposit</Text>
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

      <Modal visible={reviewing} transparent animationType="slide" onRequestClose={() => setReviewing(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setReviewing(false)}>
          <TouchableOpacity style={styles.reviewSheet} activeOpacity={1}>
            <View style={styles.grabber} />
            <Text style={styles.reviewTitle}>Review deposit</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Amount</Text>
              <Text style={styles.reviewVal}>{formatCurrency(Number(amount) || 0)}</Text>
            </View>
            <View style={[styles.reviewRow, styles.reviewRowLast]}>
              <Text style={styles.reviewKey}>Method</Text>
              <Text style={styles.reviewVal}>PayShap</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, submitting && styles.actionButtonDisabled]}
              onPress={handleRequest}
              disabled={submitting}
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
