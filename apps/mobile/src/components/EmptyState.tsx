import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// The reference empty-state pattern already used well in PostCommentsScreen
// and FriendsListScreen, pulled out so ChatScreen/ChatListScreen (which had
// none — just a blank list) and anywhere else can use the same one.
export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
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
    actionBtn: {
      marginTop: SPACING.sm,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.pill,
      paddingVertical: 8,
      paddingHorizontal: 18,
    },
    actionText: {
      color: COLORS.text,
      fontWeight: '700',
      fontSize: 12.5,
    },
  }));

  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={36} color={COLORS.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {!!actionLabel && !!onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
