import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi } from '../utils/api';
import { formatCurrency } from '../utils/format';

export default function RequestMoneyScreen({ navigation }: any) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const openReview = () => {
    setFieldError(null);
    if (!destination.trim() || !amount.trim()) {
      setFieldError('Please fill in both fields.');
      return;
    }
    if (!(Number(amount) > 0)) {
      setFieldError('Enter a valid amount.');
      return;
    }
    setReviewing(true);
  };

  const handleRequest = async () => {
    setReviewing(false);
    try {
      setSending(true);
      const res = await fetchApi('/wallets/requests', {
        method: 'POST',
        body: JSON.stringify({
          destination: destination.trim(),
          amount: amount.trim(),
          memo: memo.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Could not send the request');

      Alert.alert(
        'Request sent',
        `Asked ${destination.trim()} for ${formatCurrency(Number(amount))}. They'll be notified.`,
        [{ text: 'Back to Wallet', onPress: () => navigation.goBack() }],
      );
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
        <Text style={TYPOGRAPHY.h2}>Request Masheleni</Text>
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
          <Text style={TYPOGRAPHY.body2}>Request from</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="username"
            placeholderTextColor={COLORS.textMuted}
            value={destination}
            onChangeText={setDestination}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={TYPOGRAPHY.body2}>Note (optional)</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="What's this for?"
            placeholderTextColor={COLORS.textMuted}
            value={memo}
            onChangeText={setMemo}
          />
        </View>

        {fieldError && (
          <View style={[styles.infoCard, { borderColor: COLORS.error }]}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10, color: COLORS.error }]}>{fieldError}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
          <Text style={[TYPOGRAPHY.body2, { flex: 1, marginLeft: 10 }]}>
            They'll get a notification and can accept or decline — nothing moves until they accept.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={openReview}
          activeOpacity={0.7}
        >
          <Ionicons name="download" size={20} color={COLORS.text} />
          <Text style={styles.sendButtonText}>Review request</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={reviewing} transparent animationType="slide" onRequestClose={() => setReviewing(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setReviewing(false)}>
          <TouchableOpacity style={styles.reviewSheet} activeOpacity={1}>
            <View style={styles.grabber} />
            <Text style={styles.reviewTitle}>Review request</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>From</Text>
              <Text style={styles.reviewVal} numberOfLines={1}>{destination.trim()}</Text>
            </View>
            <View style={[styles.reviewRow, !memo.trim() && styles.reviewRowLast]}>
              <Text style={styles.reviewKey}>Amount</Text>
              <Text style={styles.reviewVal}>{formatCurrency(Number(amount) || 0)}</Text>
            </View>
            {!!memo.trim() && (
              <View style={[styles.reviewRow, styles.reviewRowLast]}>
                <Text style={styles.reviewKey}>Note</Text>
                <Text style={styles.reviewVal} numberOfLines={1}>{memo.trim()}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleRequest}
              disabled={sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color={COLORS.text} />
                  <Text style={styles.sendButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  reviewVal: { color: COLORS.text, fontSize: 14, fontWeight: '700', maxWidth: '65%' },
});
