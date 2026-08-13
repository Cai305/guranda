import type { ComponentType } from 'react';

// ============================================================
// Guranda Live — pre-live category setup registry.
//
// Mirrors liveCategoryRegistry.ts, but for the Go Live *creation*
// flow instead of the host-tools-while-broadcasting flow: a category
// registers a small setup Panel (rendered inline in GoLiveScreen)
// plus an `apply` function that fires the same real endpoints
// LiveCategoryHostPanel uses, right after the room is created — so
// e.g. a Shopping host's showcase is already live the instant they
// go live, instead of every category looking identical at creation
// time and only diverging once you're already broadcasting.
//
// A category with no meaningful advance setup (Social, Business,
// Dating, Ride) simply has no entry here — GoLiveScreen still shows
// its hostSummary as a "what happens once you're live" note.
// ============================================================

export interface GoLiveSetupProps<T = any> {
  value: T;
  onChange: (value: T) => void;
}

export interface GoLiveSetupConfig<T = any> {
  Panel: ComponentType<GoLiveSetupProps<T>>;
  initialValue: T;
  /** Called once, right after goLive() returns a real room — best-effort, never blocks going live. */
  apply: (roomId: string, value: T) => Promise<any>;
}

const registry: Record<string, GoLiveSetupConfig> = {};

export function registerGoLiveSetup(categoryId: string, config: GoLiveSetupConfig) {
  registry[categoryId] = config;
}

export function getGoLiveSetup(categoryId: string): GoLiveSetupConfig | undefined {
  return registry[categoryId];
}
