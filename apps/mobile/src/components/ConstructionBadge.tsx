import React from 'react';
import { View, Text } from 'react-native';
import { useThemedStyles } from '../theme/useThemedStyles';

export default function ConstructionBadge({ compact = false }: { compact?: boolean }) {
  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    badge: {
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(251, 191, 36, 0.4)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    compact: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    text: {
      color: COLORS.warning,
      fontSize: 11,
      fontWeight: '700',
    },
    textCompact: {
      fontSize: 10,
    },
  }));

  return (
    <View style={[styles.badge, compact && styles.compact]}>
      <Text style={[styles.text, compact && styles.textCompact]}>
        🚧{compact ? '' : ' Under Construction'}
      </Text>
    </View>
  );
}
