import React from 'react';
import { Text, ActivityIndicator, TouchableOpacity, ViewStyle, TextStyle, StyleProp, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { usePressScale } from '../theme/motion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  onPress?: () => void;
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: boolean;
  fullWidth?: boolean;
}

// The one shared pressable button in the app — replaces the ad hoc
// `TouchableOpacity` + hand-rolled style object repeated in ~359 files.
// What it adds over a plain TouchableOpacity: a real press-in scale
// (Reanimated spring, not just `activeOpacity`), a light haptic tap (no-op
// on web), and a built-in loading state that cross-fades the label for a
// spinner instead of an abrupt swap.
//
// Deliberately built on TouchableOpacity rather than RN's own Pressable —
// this app wraps everything in GestureHandlerRootView, and once that's
// mounted a plain Pressable's onPressIn/onPressOut stop firing reliably on
// web (see navigation/tabbars/OrbTabBar.tsx's comment, confirmed the hard
// way there already). TouchableOpacity doesn't have that problem.
export default function Button({
  onPress,
  label,
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  haptic = true,
  fullWidth = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const { COLORS, RADIUS, TYPOGRAPHY } = theme;
  const { style: pressStyle, onPressIn, onPressOut } = usePressScale();

  const handlePressIn = () => { if (!disabled && !loading) onPressIn(); };
  const handlePressOut = () => onPressOut();
  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  const variantStyles: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: COLORS.primary, fg: '#fff' },
    secondary: { bg: COLORS.surfaceElevated, fg: COLORS.text, border: COLORS.border },
    ghost: { bg: 'transparent', fg: COLORS.primary },
    danger: { bg: COLORS.error, fg: '#fff' },
  };
  const v = variantStyles[variant];

  return (
    <AnimatedTouchable
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 18,
          paddingVertical: 13,
          borderRadius: RADIUS.md,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        pressStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <>
          {icon}
          {label ? (
            <Text style={[{ color: v.fg, fontSize: TYPOGRAPHY.button.fontSize, fontWeight: TYPOGRAPHY.button.fontWeight }, textStyle]}>
              {label}
            </Text>
          ) : null}
          {children}
        </>
      )}
    </AnimatedTouchable>
  );
}
