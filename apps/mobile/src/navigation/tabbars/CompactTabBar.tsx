import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/ThemeContext';
import { ROUTE_LABELS, visibleRoutes, makeOnPress, AiIconButton, RouteIcon } from './shared';

// Icon-only and slim — no labels, smaller height, maximizes screen space
// for people who already know the icons. AI is a small circular gradient
// dot inline with the rest, not raised or notched.
export default function CompactTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS } = theme;

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
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <RouteIcon
          routeName={route.name}
          size={22}
          color={isFocused ? COLORS.primary : COLORS.textMuted}
          focused={isFocused}
        />
        {isFocused && (
          <View
            style={{
              width: 4, height: 4, borderRadius: 2,
              backgroundColor: COLORS.primary,
              marginTop: 4,
            }}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 46,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: insets.bottom,
      }}
    >
      {before.map(renderButton)}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AiIconButton theme={theme} size={28} iconSize={14} />
      </View>
      {after.map(renderButton)}
    </View>
  );
}
