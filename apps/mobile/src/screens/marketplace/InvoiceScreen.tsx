import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../utils/api';

export default function InvoiceScreen({ navigation, route }: any) {
  const { invoiceId } = route.params || {};
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/marketplace/invoices/${invoiceId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setInvoice)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#A78BFA" />
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Invoice</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.empty}>Invoice not found.</Text>
      </SafeAreaView>
    );
  }

  const isBuyer = invoice.buyerId === user?.userId;
  const date = new Date(invoice.createdAt);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Invoice</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        <View style={styles.card}>
          <View style={styles.paidPill}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.paidText}>PAID</Text>
          </View>

          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <Text style={styles.date}>
            {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>

          <View style={styles.itemRow}>
            {invoice.listing?.images?.length > 0 ? (
              <Image source={{ uri: invoice.listing.images[0] }} style={styles.itemThumb} />
            ) : (
              <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.itemThumb}>
                <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{invoice.itemTitle}</Text>
              {invoice.listing?.category && (
                <Text style={styles.itemMeta}>
                  {invoice.listing.category} · {invoice.listing.condition?.replace('_', ' ')}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{isBuyer ? 'Sold by' : 'Sold to'}</Text>
            <Text style={styles.rowValue}>
              {isBuyer
                ? invoice.seller?.profile?.displayName || invoice.seller?.username
                : invoice.buyer?.profile?.displayName || invoice.buyer?.username}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{isBuyer ? 'Buyer (you)' : 'Seller (you)'}</Text>
            <Text style={styles.rowValue}>
              {isBuyer
                ? invoice.buyer?.profile?.displayName || invoice.buyer?.username
                : invoice.seller?.profile?.displayName || invoice.seller?.username}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{invoice.amount} MSH</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#150A2E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  empty: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.glassBorder, padding: SPACING.lg,
  },
  paidPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  paidText: { color: '#10B981', fontSize: 10.5, fontWeight: '800' },
  invoiceNumber: { color: COLORS.text, fontWeight: '800', fontSize: 18, marginTop: 12 },
  date: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  itemThumb: { width: 56, height: 56, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  itemMeta: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 3 },
  divider: { height: 1, backgroundColor: COLORS.glassBorder, marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { color: COLORS.textMuted, fontSize: 12.5 },
  rowValue: { color: COLORS.text, fontSize: 12.5, fontWeight: '600' },
  totalLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: '#A78BFA', fontSize: 18, fontWeight: '800' },
});
