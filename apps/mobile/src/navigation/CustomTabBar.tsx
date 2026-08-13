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

  // Render the default while the stored preference is still loading rather
  // than flashing a different style for a frame.
  if (!isReady || styleId === 'orb') return <OrbTabBar {...props} />;
  if (styleId === 'classic') return <ClassicTabBar {...props} />;
  if (styleId === 'pill') return <PillTabBar {...props} />;
  if (styleId === 'compact') return <CompactTabBar {...props} />;
  return <DockTabBar {...props} />;
}
