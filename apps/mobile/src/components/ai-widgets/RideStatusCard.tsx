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
  distanceKm?: number;
  // Only present once a driver has accepted — the card degrades gracefully
  // without this section while the ride is still REQUESTED.
  driverUsername?: string;
  driverRating?: number;
  driverTotalRides?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  onPress: () => void;
}

const ACTION_LABEL: Record<string, string> = {
  REQUESTED: 'CANCEL REQUEST',
  ACCEPTED: 'TRACK RIDE',
  IN_PROGRESS: 'TRACK RIDE',
  COMPLETED: 'VIEW RECEIPT',
  CANCELLED: 'BOOK ANOTHER RIDE',
};

export default function RideStatusCard({
  status,
  pickupAddress,
  dropoffAddress,
  fare,
  distanceKm,
  driverUsername,
  driverRating,
  driverTotalRides,
  vehicleMake,
  vehicleModel,
  vehiclePlate,
  onPress,
}: RideStatusCardProps) {
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
  const hasDriver = !!driverUsername;
  const vehicleLabel = [vehicleMake, vehicleModel].filter(Boolean).join(' ');

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
    driverCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.sm,
      padding: 8,
      gap: 10,
      marginTop: 2,
    },
    vehicleTile: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.sm,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    driverAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    driverInfo: { flex: 1, gap: 1 },
    driverName: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
    driverMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    driverMeta: { color: COLORS.textMuted, fontSize: 11 },
    plateChip: {
      backgroundColor: COLORS.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    plateChipText: { color: COLORS.text, fontWeight: '700', fontSize: 10, letterSpacing: 0.3 },
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
        {distanceKm !== undefined && <Text style={styles.driverMeta}>{distanceKm.toFixed(1)} km</Text>}
      </View>

      {hasDriver && (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={18} color={COLORS.text} />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName} numberOfLines={1}>{driverUsername}</Text>
            <View style={styles.driverMetaRow}>
              <Ionicons name="star" size={11} color={COLORS.gold} />
              <Text style={styles.driverMeta}>
                {(driverRating ?? 5).toFixed(1)} · {driverTotalRides ?? 0} trips
              </Text>
            </View>
          </View>
          {vehicleLabel ? (
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <View style={styles.vehicleTile}>
                <Ionicons name="car-sport" size={18} color={COLORS.text} />
              </View>
              {vehiclePlate ? (
                <View style={styles.plateChip}>
                  <Text style={styles.plateChipText}>{vehiclePlate}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
      {hasDriver && vehicleLabel ? (
        <Text style={[styles.driverMeta, { marginLeft: 2 }]}>{vehicleLabel}</Text>
      ) : null}

      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={onPress}>
        <Text style={styles.actionText}>{ACTION_LABEL[status] ?? 'VIEW RIDE'}</Text>
      </TouchableOpacity>
    </View>
  );
}
