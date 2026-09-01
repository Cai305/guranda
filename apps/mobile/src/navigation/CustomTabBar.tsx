import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTabBarStyle } from '../context/TabBarStyleContext';
import OrbTabBar from './tabbars/OrbTabBar';
import ClassicTabBar from './tabbars/ClassicTabBar';
import PillTabBar from './tabbars/PillTabBar';
import CompactTabBar from './tabbars/CompactTabBar';
import DockTabBar from './tabbars/DockTabBar';

// Dispatches to whichever bottom-bar style the user picked in Appearance
// (config/tabBarStyles.ts) — "Orb" is the default. All five share the same
// route filtering, icons, and AI trigger gesture (see tabbars/shared.tsx);
// only the visual treatment differs.
export default function CustomTabBar(props: BottomTabBarProps) {
  const { styleId, isReady } = useTabBarStyle();

  // Screens set options.tabBarStyle={{display:'none'}} (directly, e.g. the
  // "Life" tab which hosts every mini-app/game, or via
  // navigation.getParent()?.setOptions(...) from a nested screen, e.g. an
  // individual chat conversation) to reclaim the bar's screen space. None of
  // the 5 tab bar styles below read `options` for this themselves, so it's
  // handled once, here, before dispatching to any of them.
  const focusedRoute = props.state.routes[props.state.index];
  const focusedStyle = props.descriptors[focusedRoute.key]?.options.tabBarStyle as
    | { display?: string }
    | undefined;
  if (focusedStyle?.display === 'none') return null;

  // Render the default while the stored preference is still loading rather
  // than flashing a different style for a frame.
  if (!isReady || styleId === 'orb') return <OrbTabBar {...props} />;
  if (styleId === 'classic') return <ClassicTabBar {...props} />;
  if (styleId === 'pill') return <PillTabBar {...props} />;
  if (styleId === 'compact') return <CompactTabBar {...props} />;
  return <DockTabBar {...props} />;
}
