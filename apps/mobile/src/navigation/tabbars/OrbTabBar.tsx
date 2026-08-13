import React from 'react';
import { View, TouchableOpacity, Text, Animated, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/ThemeContext';
import { useAiOrb } from '../../context/AiOrbContext';
import { BAR_HEIGHT, ORB_SIZE, NOTCH_RADIUS } from '../aiOrbMetrics';
import { ROUTE_ICONS, ROUTE_LABELS, visibleRoutes, makeOnPress, usePulse } from './shared';

// Default style: one continuous pill bar with a circular notch cut into its
// top edge — the AI orb sits nested in that notch, half poking above the
// bar and half tucked into the cavity, so it reads as part of the bar
// rather than a separate floating element.
//
// Built on react-native-gesture-handler's Gesture API rather than RN's own
// Pressable: this app wraps everything in GestureHandlerRootView, and once
// that's mounted, a plain Pressable's onPressIn/onPressOut stop firing
// reliably on web (confirmed the hard way — same reason the original
// floating orb used Gesture.Pan instead of a Pressable).
function buildNotchedBarPath(width: number, height: number, notchR: number) {
  const cornerR = height / 2;
  const cx = width / 2;
  return [
    `M 0,${cornerR}`,
    `A ${cornerR},${cornerR} 0 0 1 ${cornerR},0`,
    `L ${cx - notchR},0`,
    `A ${notchR},${notchR} 0 0 1 ${cx + notchR},0`,
    `L ${width - cornerR},0`,
    `A ${cornerR},${cornerR} 0 0 1 ${width},${cornerR}`,
    `L ${width},${height - cornerR}`,
    `A ${cornerR},${cornerR} 0 0 1 ${width - cornerR},${height}`,
    `L ${cornerR},${height}`,
    `A ${cornerR},${cornerR} 0 0 1 0,${height - cornerR}`,
    'Z',
  ].join(' ');
}

export default function OrbTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const { COLORS, GRADIENTS, SHADOW, SPACING } = theme;
  const { open, pressing, progress, handlePressIn, handlePressOut } = useAiOrb();
  const pulse = usePulse();

  const sideRoutes = visibleRoutes(state);
  const half = Math.ceil(sideRoutes.length / 2);
  const leftRoutes = sideRoutes.slice(0, half);
  const rightRoutes = sideRoutes.slice(half);

  const renderSideButton = (route: (typeof state.routes)[number]) => {
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
        style={{ alignItems: 'center', justifyContent: 'center', height: BAR_HEIGHT, paddingHorizontal: 10 }}
      >
        <Ionicons
          name={ROUTE_ICONS[route.name] ?? 'ellipse-outline'}
          size={20}
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

  const holdRingScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const holdRingOpacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseGlowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  const orbGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => { runOnJS(handlePressIn)(); })
    .onFinalize(() => { runOnJS(handlePressOut)(); });

  const barWidth = screenWidth - SPACING.lg * 2;
  const barPath = buildNotchedBarPath(barWidth, BAR_HEIGHT, NOTCH_RADIUS);

  return (
    <View style={{ position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: insets.bottom + SPACING.sm }}>
      <View style={{ width: barWidth, height: BAR_HEIGHT, ...SHADOW.glow, shadowOpacity: 0.18, shadowColor: '#000' }}>
        <Svg width={barWidth} height={BAR_HEIGHT} style={{ position: 'absolute' }}>
          <Path d={barPath} fill={COLORS.surfaceElevated} stroke={COLORS.glassBorder} strokeWidth={1} />
        </Svg>
        <View style={{ flexDirection: 'row', width: barWidth, height: BAR_HEIGHT, alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly' }}>
            {leftRoutes.map(renderSideButton)}
          </View>
          {/* Fixed-width channel matching the SVG notch exactly — everything
              else here scales with the bar so this stays centered and the
              icon groups never overflow it on narrower screens. */}
          <View style={{ width: NOTCH_RADIUS * 2 }} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly' }}>
            {rightRoutes.map(renderSideButton)}
          </View>
        </View>
      </View>

      {/* Orb nests in the notch — half poking above the bar, half sunk into
          the cavity, so it reads as docked into the bar rather than a
          separate floating piece. */}
      <View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          top: -(ORB_SIZE / 2),
          width: ORB_SIZE,
          height: ORB_SIZE,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -10, left: -10, right: -10, bottom: -10,
            borderRadius: (ORB_SIZE + 20) / 2,
            backgroundColor: COLORS.secondary,
            opacity: open ? 0.15 : pulseGlowOpacity,
            transform: [{ scale: open ? 1 : pulseScale }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6, left: -6, right: -6, bottom: -6,
            borderRadius: (ORB_SIZE + 12) / 2,
            borderWidth: 3,
            borderColor: COLORS.secondary,
            opacity: pressing ? holdRingOpacity : 0,
            transform: [{ scale: holdRingScale }],
          }}
        />
        <GestureDetector gesture={orbGesture}>
          <Animated.View
            accessibilityRole="button"
            accessibilityLabel="AI assistant — tap to chat, hold to talk"
            style={{ width: ORB_SIZE, height: ORB_SIZE, transform: [{ scale: open ? 1 : pulseScale }] }}
          >
            <LinearGradient
              colors={GRADIENTS.aurora}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: ORB_SIZE,
                height: ORB_SIZE,
                borderRadius: ORB_SIZE / 2,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                ...SHADOW.glow,
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 5,
                  left: 7,
                  width: ORB_SIZE * 0.55,
                  height: ORB_SIZE * 0.4,
                  borderRadius: ORB_SIZE,
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  transform: [{ rotate: '-18deg' }],
                }}
              />
              {open && <Ionicons name="chevron-down" size={18} color="#FFF" />}
            </LinearGradient>
          </Animated.View>
        </GestureDetector>
      </View>
      {/* Sits in the same vertical band the other tabs' labels do — low
          enough to land on solid bar material below the notch's cavity
          (which only cuts down to NOTCH_RADIUS), not in the transparent cutout. */}
      <Text
        numberOfLines={1}
        style={{
          position: 'absolute',
          alignSelf: 'center',
          top: 36,
          fontSize: 10,
          fontWeight: open ? '700' : '500',
          color: open ? COLORS.primary : COLORS.textMuted,
        }}
      >
        AI
      </Text>
    </View>
  );
}
