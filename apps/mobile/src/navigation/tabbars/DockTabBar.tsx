import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/ThemeContext';
import { ROUTE_LABELS, visibleRoutes, makeOnPress, AiIconButton, RouteIcon } from './shared';

// A frosted-glass floating dock of circular buttons, macOS-dock inspired.
// No labels — the active icon lifts (scales up) and sits on a soft glow
// disc instead of a color change, so focus reads through motion/elevation
// rather than tint.
export default function DockTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS, RADIUS, SPACING } = theme;

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
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isFocused ? COLORS.primary + '2A' : 'transparent',
            transform: [{ scale: isFocused ? 1.12 : 1 }],
          }}
        >
          <RouteIcon
            routeName={route.name}
            size={22}
            color={isFocused ? COLORS.primary : COLORS.text}
            focused={isFocused}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ position: 'absolute', left: SPACING.xl, right: SPACING.xl, bottom: insets.bottom + SPACING.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          height: 68,
          borderRadius: RADIUS.pill,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
          overflow: 'hidden',
        }}
      >
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,18,26,0.3)' }]} />
        {before.map(renderButton)}
        <AiIconButton theme={theme} size={48} iconSize={22} />
        {after.map(renderButton)}
      </View>
    </View>
  );
}
