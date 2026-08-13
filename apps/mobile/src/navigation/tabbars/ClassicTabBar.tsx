import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/ThemeContext';
import { useAiOrb } from '../../context/AiOrbContext';
import { ROUTE_ICONS, ROUTE_LABELS, visibleRoutes, makeOnPress, AiIconButton } from './shared';

// A traditional flat bar anchored to the bottom edge — no floating, no
// notch. Five equal tabs, icon above label, AI slotted in as a plain tab
// like the rest rather than a raised centerpiece. The most conservative,
// lowest-visual-noise option in the gallery.
export default function ClassicTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { open } = useAiOrb();

  const routes = visibleRoutes(state);

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
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}
      >
        <Ionicons
          name={ROUTE_ICONS[route.name] ?? 'ellipse-outline'}
          size={22}
          color={isFocused ? COLORS.primary : COLORS.textMuted}
        />
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontWeight: isFocused ? '700' : '500',
            marginTop: 3,
            color: isFocused ? COLORS.primary : COLORS.textMuted,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const half = Math.floor(routes.length / 2);
  const before = routes.slice(0, half);
  const after = routes.slice(half);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: insets.bottom,
      }}
    >
      {before.map(renderButton)}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
        <AiIconButton theme={theme} size={38} iconSize={18} />
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontWeight: open ? '700' : '500',
            marginTop: 3,
            color: open ? COLORS.primary : COLORS.textMuted,
          }}
        >
          AI
        </Text>
      </View>
      {after.map(renderButton)}
    </View>
  );
}
