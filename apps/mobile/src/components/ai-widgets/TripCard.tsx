import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';

export interface Trip {
  type: 'stay' | 'car' | 'flight' | 'package';
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  totalPrice: number;
  status: string;
}

const TYPE_META: Record<Trip['type'], { icon: keyof typeof Ionicons.glyphMap; actionLabel: string }> = {
  flight: { icon: 'airplane', actionLabel: 'DETAILS' },
  car: { icon: 'car-sport', actionLabel: 'MANAGE RENTAL' },
  stay: { icon: 'bed', actionLabel: 'VIEW RESERVATION' },
  package: { icon: 'briefcase', actionLabel: 'VIEW DETAILS' },
};

function money(n: number): string {
  return `R ${Number(n).toFixed(2)}`;
}

// Full-width "reservation" card — every AI reply that touches an existing
// booking (myTrips) renders as a stack of these instead of a paragraph
// describing them, matching the reference screenshot: icon + title/subtitle
// header, a route/date row, and one action button per booking type.
export default function TripCard({ trip }: { trip: Trip }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = TYPE_META[trip.type] ?? TYPE_META.package;
  const isConfirmed = trip.status === 'CONFIRMED';

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    card: {
      alignSelf: 'stretch',
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    iconWrap: {
      width: 30, height: 30, borderRadius: 8,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    title: { color: COLORS.text, fontWeight: '800', fontSize: 13.5 },
    subtitle: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 1 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
    statusConfirmed: { backgroundColor: 'rgba(251,191,36,0.15)' },
    statusOther: { backgroundColor: COLORS.glass },
    statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
    statusTextConfirmed: { color: COLORS.gold },
    statusTextOther: { color: COLORS.textMuted },
    metaRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.glassBorder,
    },
    dateLabel: { color: COLORS.textMuted, fontSize: 11.5 },
    price: { color: COLORS.gold, fontWeight: '800', fontSize: 13 },
    actionBtn: {
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.sm, paddingVertical: 9, alignItems: 'center',
    },
    actionText: { color: COLORS.text, fontWeight: '700', fontSize: 11.5, letterSpacing: 0.3 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.lg },
    modalCard: {
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.glassBorder, alignItems: 'center', gap: 4,
    },
    modalIconWrap: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    modalTitle: { color: COLORS.text, fontWeight: '800', fontSize: 16, textAlign: 'center' },
    modalSubtitle: { color: COLORS.textMuted, fontSize: 12.5, marginBottom: 8, textAlign: 'center' },
    modalDivider: { height: 1, backgroundColor: COLORS.glassBorder, alignSelf: 'stretch', marginBottom: 8 },
    modalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 4,
    },
    modalLabel: { color: COLORS.textMuted, fontSize: 12.5 },
    modalValue: { color: COLORS.text, fontSize: 12.5, fontWeight: '700' },
    closeBtn: { marginTop: 12, paddingVertical: 10, alignSelf: 'stretch', alignItems: 'center' },
    closeBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12.5 },
  }));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={meta.icon} size={16} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{trip.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{trip.subtitle}</Text>
        </View>
        <View style={[styles.statusPill, isConfirmed ? styles.statusConfirmed : styles.statusOther]}>
          <Text style={[styles.statusText, isConfirmed ? styles.statusTextConfirmed : styles.statusTextOther]}>
            {trip.status}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.dateLabel}>{trip.dateLabel}</Text>
        <Text style={styles.price}>{money(trip.totalPrice)}</Text>
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={() => setDetailsOpen(true)} activeOpacity={0.85}>
        <Text style={styles.actionText}>{meta.actionLabel}</Text>
      </TouchableOpacity>

      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name={meta.icon} size={20} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>{trip.title}</Text>
            <Text style={styles.modalSubtitle}>{trip.subtitle}</Text>
            <View style={styles.modalDivider} />
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>When</Text>
              <Text style={styles.modalValue}>{trip.dateLabel}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Total paid</Text>
              <Text style={styles.modalValue}>{money(trip.totalPrice)}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Status</Text>
              <Text style={styles.modalValue}>{trip.status}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailsOpen(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
