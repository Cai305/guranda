import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';

export default function SendScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { isVerified, refreshVerification } = useAuth();
  const styles = useThemedStyles(({ COLORS }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
    },
    backButton: {
      padding: 4,
    },
    form: {
      flex: 1,
      paddingHorizontal: 20,
      gap: 24,
    },
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
    inputGroup: {
      gap: 8,
    },
    addressInput: {
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      fontFamily: 'monospace',
      fontSize: 14,
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
    errorCard: {
      borderColor: COLORS.error,
    },
    balanceHint: {
      color: COLORS.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: -12,
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
    reviewKey: {
      color: COLORS.textMuted,
      fontSize: 14,
    },
    reviewVal: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: '700',
      maxWidth: '65%',
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: COLORS.primary,
      padding: 18,
      borderRadius: 16,
      marginTop: 10,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendButtonText: {
      color: COLORS.text,
      fontSize: 18,
      fontWeight: '600',
    },
  }));

  // Same staleness fix as DepositScreen — see its comment for why this can't
  // just rely on AuthContext's login/foreground refresh alone.
  useFocusEffect(useCallback(() => { refreshVerification(); }, [refreshVerification]));

  useFocusEffect(useCallback(() => {
    fetchApi('/wallets/me')
      .then(res => (res.ok ? res.json() : null))
      .then(w => setBalance(w ? Number(w.balanceMasheleni) : null))
      .catch(() => {});
  }, []));

  if (!isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Send Masheleni</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.form}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={20} color="#F59E0B" />
            <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]}>
              Verify your account to send money — this keeps the wallet and creator funds safe for everyone.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => navigation.navigate('VerifyAccount', { reason: 'Sending money requires a verified account' })}
          >
            <Ionicons name="shield-checkmark" size={20} color={COLORS.text} />
            <Text style={styles.sendButtonText}>Verify my account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openReview = () => {
    setFieldError(null);
    if (!destination.trim() || !amount.trim()) {
      setFieldError('Enter a destination and an amount.');
      return;
    }
    const value = Number(amount);
    if (!(value > 0)) {
      setFieldError('Enter a valid amount.');
      return;
    }
    if (balance !== null && value > balance) {
      setFieldError(`That's more than your balance of ${formatCurrency(balance)}.`);
      return;
    }
    setReviewing(true);
  };

  const handleSend = async () => {
    setReviewing(false);
    try {
      setSending(true);
      const res = await fetchApi('/wallets/send', {
        method: 'POST',
        body: JSON.stringify({
          destination: destination.trim(),
          amount: amount.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      if (data.success) {
        Alert.alert(
          'Transfer Complete! ✅',
          `Sent ${formatCurrency(Number(amount))} to ${destination.substring(0, 12)}...\n\nTx Hash: ${data.txHash?.substring(0, 20)}...`,
          [{ text: 'Back to Wallet', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert('Transfer Failed', 'The XRPL transaction did not succeed. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Send Masheleni</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
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

        <View style={styles.inputGroup}>
          <Text style={TYPOGRAPHY.body2}>Send to (username or XRPL address)</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="@username or rXXXX..."
            placeholderTextColor={COLORS.textMuted}
            value={destination}
            onChangeText={setDestination}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {balance !== null && (
          <Text style={styles.balanceHint}>Balance: {formatCurrency(balance)}</Text>
        )}

        {fieldError && (
          <View style={[styles.infoCard, styles.errorCard]}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10, color: COLORS.error }]}>{fieldError}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]}>
            Transactions are submitted directly to the XRP Ledger Testnet. Fees are typically {'<'} 0.00001 XRP.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={openReview}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          <Text style={styles.sendButtonText}>Review transfer</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={reviewing} transparent animationType="slide" onRequestClose={() => setReviewing(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setReviewing(false)}>
          <TouchableOpacity style={styles.reviewSheet} activeOpacity={1}>
            <View style={styles.grabber} />
            <Text style={styles.reviewTitle}>Review transfer</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>To</Text>
              <Text style={styles.reviewVal} numberOfLines={1}>{destination.trim()}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Amount</Text>
              <Text style={styles.reviewVal}>{formatCurrency(Number(amount) || 0)}</Text>
            </View>
            <View style={[styles.reviewRow, styles.reviewRowLast]}>
              <Text style={styles.reviewKey}>Network fee</Text>
              <Text style={styles.reviewVal}>{'< 0.00001 XRP'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.text} />
                  <Text style={styles.sendButtonText}>Confirm & Send</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

