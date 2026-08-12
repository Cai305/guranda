import type { ComponentType } from 'react';

// ============================================================
// Guranda Live — per-category panel registry.
//
// Each Live category's host controls and viewer interactions used to
// live inside one long if/else chain in LiveCategoryHostPanel.tsx and
// LiveCategoryViewerPanel.tsx — adding a new live-capable mini-app
// meant hand-editing both chains. This registry replaces that: a
// category's panel components register themselves once (see the
// bottom of LiveCategoryHostPanel.tsx / LiveCategoryViewerPanel.tsx
// for the 11 categories that already lived in those two files, and
// categories/rideLivePanel.tsx for a category that lives entirely in
// its own file — the pattern a genuinely new mini-app should follow),
// and the two panel components just look the category up here instead
// of branching on categoryId themselves.
//
// Registering the same categoryId twice (e.g. once for Host from
// LiveCategoryHostPanel.tsx, once for Viewer from
// LiveCategoryViewerPanel.tsx) merges — it doesn't overwrite.
// ============================================================

export interface LiveCategoryPanelConfig {
  /** Rendered by LiveCategoryHostPanel for this categoryId. */
  Host?: ComponentType<any>;
  /** Rendered by LiveCategoryViewerPanel for this categoryId. */
  Viewer?: ComponentType<any>;
}

const registry: Record<string, LiveCategoryPanelConfig> = {};

export function registerLiveCategoryPanel(categoryId: string, config: LiveCategoryPanelConfig) {
  registry[categoryId] = { ...registry[categoryId], ...config };
}

export function getLiveCategoryPanel(categoryId: string): LiveCategoryPanelConfig | undefined {
  return registry[categoryId];
}
