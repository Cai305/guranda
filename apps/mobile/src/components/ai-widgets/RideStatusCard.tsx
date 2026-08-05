import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface RideStatusCardProps {
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  fare?: number;
}

export default function RideStatusCard({ status, pickupAddress, dropoffAddress, fare }: RideStatusCardProps) {
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
      width: 240,
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
  }));
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="car" size={16} color={color} />
        <Text style={[styles.status, { color }]}>{status.replace(/_/g, ' ')}</Text>
        {fare !== undefined && <Text style={styles.fare}>{fare} MSH</Text>}
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="ellipse" size={8} color={COLORS.success} />
        <Text style={styles.address} numberOfLines={1}>{pickupAddress}</Text>
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="location" size={10} color={COLORS.error} />
        <Text style={styles.address} numberOfLines={1}>{dropoffAddress}</Text>
      </View>
    </View>
  );
}
