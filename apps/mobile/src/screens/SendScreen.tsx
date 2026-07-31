import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function SendScreen({ navigation }: any) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const { isVerified, refreshVerification } = useAuth();

  // Same staleness fix as DepositScreen — see its comment for why this can't
  // just rely on AuthContext's login/foreground refresh alone.
  useFocusEffect(useCallback(() => { refreshVerification(); }, [refreshVerification]));

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
              Verify your account to send MSH — this keeps the wallet and creator funds safe for everyone.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => navigation.navigate('VerifyAccount', { reason: 'Sending MSH requires a verified account' })}
          >
            <Ionicons name="shield-checkmark" size={20} color={COLORS.text} />
            <Text style={styles.sendButtonText}>Verify my account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSend = async () => {
    if (!destination.trim() || !amount.trim()) {
      Alert.alert('Error', 'Please fill in both fields.');
      return;
    }

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
          `Sent ${amount} MSH to ${destination.substring(0, 12)}...\n\nTx Hash: ${data.txHash?.substring(0, 20)}...`,
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
          <Text style={styles.currencyLabel}>MSH</Text>
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
          <Text style={TYPOGRAPHY.body2}>Destination XRPL Address</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="rXXXX..."
            placeholderTextColor={COLORS.textMuted}
            value={destination}
            onChangeText={setDestination}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]}>
            Transactions are submitted directly to the XRP Ledger Testnet. Fees are typically {'<'} 0.00001 XRP.
          </Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
