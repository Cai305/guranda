import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/ThemeContext';
import { useAiOrb } from '../../context/AiOrbContext';
import { ROUTE_ICONS, ROUTE_LABELS, visibleRoutes, makeOnPress, AiIconButton } from './shared';

// A floating rounded bar with no notch — all five items sit inline at the
// same height. The active tab gets a soft capsule highlight behind its
// icon+label instead of a color change or dot, the Android-Material-You
// navigation-bar pattern. AI is a colored circular icon among equals, not
// raised above the bar.
export default function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, RADIUS, SHADOW, SPACING } = theme;
  const { open } = useAiOrb();

  const routes = visibleRoutes(state);
  const half = Math.floor(routes.length / 2);
  const before = routes.slice(0, half);
  const after = routes.slice(half);

  const renderButton = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex(r => r.key === route.key);
    const isFocused = state.index === index;
    const { options } = descriptors[route.key];
    const label = (options.tabBarLabel as string) ?? ROUTE_LABELS[route.name] ?? route.name;

    return (
      <TouchableOpacity
        key={route.key}
        onPress={makeOnPress(route, isFocused, navigation)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
        style={{ flex: 1, alignItems: 'center' }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: isFocused ? 14 : 10,
            paddingVertical: 8,
            borderRadius: RADIUS.pill,
            backgroundColor: isFocused ? COLORS.primary + '22' : 'transparent',
          }}
        >
          <Ionicons
            name={ROUTE_ICONS[route.name] ?? 'ellipse-outline'}
            size={20}
            color={isFocused ? COLORS.primary : COLORS.textMuted}
          />
          {isFocused && (
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>
              {label}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: insets.bottom + SPACING.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 60,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          paddingHorizontal: SPACING.sm,
          ...SHADOW.glow,
          shadowOpacity: 0.18,
          shadowColor: '#000',
        }}
      >
        {before.map(renderButton)}
        <View
          style={{
            paddingHorizontal: open ? 12 : 0,
            paddingVertical: 6,
            borderRadius: RADIUS.pill,
            backgroundColor: open ? COLORS.primary + '22' : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AiIconButton theme={theme} size={34} iconSize={16} />
          {open && (
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>
              AI
            </Text>
          )}
        </View>
        {after.map(renderButton)}
      </View>
    </View>
  );
}
