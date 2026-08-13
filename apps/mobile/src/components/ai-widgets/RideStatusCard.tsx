import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { formatCurrency } from '../../utils/format';

interface RideStatusCardProps {
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  fare?: number;
  onPress: () => void;
}

const ACTION_LABEL: Record<string, string> = {
  REQUESTED: 'CANCEL REQUEST',
  ACCEPTED: 'TRACK RIDE',
  IN_PROGRESS: 'TRACK RIDE',
  COMPLETED: 'VIEW RECEIPT',
  CANCELLED: 'BOOK ANOTHER RIDE',
};

export default function RideStatusCard({ status, pickupAddress, dropoffAddress, fare, onPress }: RideStatusCardProps) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const STATUS_COLOR: Record<string, string> = {
    REQUESTED: COLORS.gold,
    ACCEPTED: COLORS.primary,
    IN_PROGRESS: COLORS.primary,
    COMPLETED: COLORS.success,
    CANCELLED: COLORS.error,
  };
  const color = STATUS_COLOR[status] ?? COLORS.textMuted;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    card: {
      alignSelf: 'stretch',
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      gap: 6,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    status: { fontWeight: '800', fontSize: 12, flex: 1 },
    fare: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    address: { color: COLORS.textMuted, fontSize: 11, flex: 1 },
    actionBtn: {
      marginTop: 2, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.sm, paddingVertical: 9, alignItems: 'center',
    },
    actionText: { color: COLORS.primary, fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },
  }));
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="car" size={16} color={color} />
        <Text style={[styles.status, { color }]}>{status.replace(/_/g, ' ')}</Text>
        {fare !== undefined && <Text style={styles.fare}>{formatCurrency(fare)}</Text>}
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="ellipse" size={8} color={COLORS.success} />
        <Text style={styles.address} numberOfLines={1}>{pickupAddress}</Text>
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="location" size={10} color={COLORS.error} />
        <Text style={styles.address} numberOfLines={1}>{dropoffAddress}</Text>
      </View>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={onPress}>
        <Text style={styles.actionText}>{ACTION_LABEL[status] ?? 'VIEW RIDE'}</Text>
      </TouchableOpacity>
    </View>
  );
}
