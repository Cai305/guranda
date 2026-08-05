import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GlassCard({ children, style }: Props) {
  const styles = useThemedStyles(({ GLASS_CARD, SPACING }) => ({
    card: {
      ...GLASS_CARD,
      padding: SPACING.lg,
    },
  }));
  return <View style={[styles.card, style]}>{children}</View>;
}
