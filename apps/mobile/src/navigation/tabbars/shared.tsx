import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAiOrb } from '../../context/AiOrbContext';
import { useAuth } from '../../context/AuthContext';
import { ThemeTokens } from '../../theme/themes';

// Shared across every bottom-bar style variant (see config/tabBarStyles.ts)
// so route filtering, icon choice, and the AI trigger gesture stay
// consistent no matter which visual treatment is picked.

export const HIDDEN_ROUTES = ['Life'];

export const ROUTE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'planet-outline',
  Chat: 'chatbubbles-outline',
  Explore: 'compass-outline',
  Profile: 'person-circle-outline',
};

export const ROUTE_LABELS: Record<string, string> = {
  Home: 'Home',
  Chat: 'Chats',
  Explore: 'Explore',
  Profile: 'Profile',
};

export function visibleRoutes(state: BottomTabBarProps['state']) {
  return state.routes.filter(r => !HIDDEN_ROUTES.includes(r.name));
}

interface RouteIconProps {
  routeName: string;
  size: number;
  color: string;
  focused: boolean;
}

// The Profile tab shows the user's own avatar instead of a generic icon —
// every other tab keeps its Ionicons glyph. Centralized here so all 5
// tab-bar styles (Orb/Classic/Pill/Compact/Dock) render it identically
// instead of each hardcoding <Ionicons name={ROUTE_ICONS[route.name]}>.
export function RouteIcon({ routeName, size, color, focused }: RouteIconProps) {
  const { user } = useAuth();
  if (routeName === 'Profile') {
    const uri = user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.username || 'lifeos'}`;
    return (
      <Image
        source={{ uri }}
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: focused ? 1.5 : 0, borderColor: color,
        }}
      />
    );
  }
  return <Ionicons name={ROUTE_ICONS[routeName] ?? 'ellipse-outline'} size={size} color={color} />;
}

// Tabs backed by their own stack navigator (see BottomTabNavigator.tsx) —
// pressing the tab always resets to this root screen, the same "tap the tab
// to go home" convention WhatsApp/Instagram use. Without this, a stack that
// was left deep on some screen (e.g. Chat left open on an individual
// conversation) just silently resumes there on the next tab press instead
// of showing that tab's default list/home UI — and worse, pressing an
// ALREADY-focused tab did nothing at all, since the plain
// `!isFocused && navigation.navigate(...)` guard below never even ran.
// Explore/Profile have no nested stack (single screen), so they're left out.
const TAB_ROOT_SCREEN: Record<string, string> = {
  Home: 'Dashboard',
  Chat: 'ChatList',
};

export function makeOnPress(
  route: BottomTabBarProps['state']['routes'][number],
  isFocused: boolean,
  navigation: BottomTabBarProps['navigation'],
) {
  return () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;
    const rootScreen = TAB_ROOT_SCREEN[route.name];
    if (rootScreen) {
      navigation.navigate(route.name, { screen: rootScreen });
    } else if (!isFocused) {
      navigation.navigate(route.name);
    }
  };
}

// A gentle breathing loop — reused by any style that wants the AI trigger to
// read as a living presence rather than a static icon.
export function usePulse() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
}

interface AiIconButtonProps {
  theme: ThemeTokens;
  size: number;
  iconSize?: number;
}

// The AI trigger for every non-"orb" style — same tap/hold gesture as the
// orb (see AiOrbContext), just rendered inline as a normal-sized circular
// icon instead of a raised, notched centerpiece.
export function AiIconButton({ theme, size, iconSize }: AiIconButtonProps) {
  const { open, pressing, progress, handlePressIn, handlePressOut } = useAiOrb();
  const { COLORS, GRADIENTS, SHADOW } = theme;
  const pulse = usePulse();

  const holdRingScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const holdRingOpacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => { runOnJS(handlePressIn)(); })
    .onFinalize(() => { runOnJS(handlePressOut)(); });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale: open ? 1 : pulseScale }] }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -5, left: -5, right: -5, bottom: -5,
          borderRadius: (size + 10) / 2,
          borderWidth: 2.5,
          borderColor: COLORS.secondary,
          opacity: pressing ? holdRingOpacity : 0,
          transform: [{ scale: holdRingScale }],
        }}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessibilityRole="button"
          accessibilityLabel="AI assistant — tap to chat, hold to talk"
        >
          <LinearGradient
            colors={GRADIENTS.aurora}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              justifyContent: 'center',
              alignItems: 'center',
              ...SHADOW.glow,
            }}
          >
            <Ionicons name={open ? 'close' : 'sparkles'} size={iconSize ?? Math.round(size * 0.5)} color="#FFF" />
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
