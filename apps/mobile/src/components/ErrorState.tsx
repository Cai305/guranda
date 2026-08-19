import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}

// Paired with EmptyState — for the "the fetch actually failed" case
// specifically, so it never gets confused with "there's genuinely nothing
// here yet" (they read very differently to a user).
export default function ErrorState({
  title = "Couldn't load this",
  subtitle = 'Check your connection and try again.',
  onRetry,
}: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.xxl,
      paddingHorizontal: SPACING.xl,
      gap: SPACING.sm,
    },
    title: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: SPACING.xs,
    },
    subtitle: {
      color: COLORS.textMuted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
    },
    retryBtn: {
      marginTop: SPACING.sm,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.pill,
      paddingVertical: 8,
      paddingHorizontal: 18,
    },
    retryText: {
      color: COLORS.text,
      fontWeight: '700',
      fontSize: 12.5,
    },
  }));

  return (
    <View style={styles.wrap}>
      <Ionicons name="alert-circle-outline" size={36} color={COLORS.error} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {!!onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
