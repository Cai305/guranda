// Bottom-bar style gallery — mirrors the theme gallery pattern (themes.ts):
// several genuinely distinct layouts, not just a recolor of the same shape.
export type TabBarStyleId = 'orb' | 'classic' | 'pill' | 'compact' | 'dock';

export interface TabBarStyleMeta {
  id: TabBarStyleId;
  name: string;
  description: string;
}

export const DEFAULT_TAB_BAR_STYLE: TabBarStyleId = 'orb';

export const TAB_BAR_STYLES: TabBarStyleMeta[] = [
  {
    id: 'orb',
    name: 'Orb',
    description: 'Floating bar with a notch the AI orb nests into — icons, labels, and a living, pulsing AI presence.',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'A traditional flat bar anchored to the edge — five equal tabs with icon and label, AI included as one of them.',
  },
  {
    id: 'pill',
    name: 'Pill',
    description: 'A floating rounded bar with no notch — the active tab gets a soft capsule highlight behind its icon.',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Icon-only and slim, no labels — maximizes screen space for people who already know the icons.',
  },
  {
    id: 'dock',
    name: 'Dock',
    description: 'A frosted-glass floating dock of circular buttons — the active icon lifts and glows.',
  },
];
