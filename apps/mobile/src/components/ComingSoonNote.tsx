import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme';

interface Props {
  text: string;
}

// Inline "🚧 Coming soon" note for a feature living inside an
// otherwise-live screen (e.g. gifting inside a live viewer).
export default function ComingSoonNote({ text }: Props) {
  return (
    <View style={styles.row}>
      <Ionicons name="construct-outline" size={14} color={COLORS.warning} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  text: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
