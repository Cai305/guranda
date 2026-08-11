// Preset chat wallpapers — stored server-side as their `id` (an opaque
// string as far as the API is concerned). A custom photo wallpaper is
// stored as its full https:// upload URL instead, so `isPresetId` below is
// how the renderer tells the two apart.

export interface ChatWallpaperPreset {
  id: string;
  label: string;
  colors: [string, string];
}

export const CHAT_WALLPAPER_PRESETS: ChatWallpaperPreset[] = [
  { id: 'preset:midnight', label: 'Midnight', colors: ['#0F0C29', '#302B63'] },
  { id: 'preset:sunset', label: 'Sunset', colors: ['#FF512F', '#DD2476'] },
  { id: 'preset:ocean', label: 'Ocean', colors: ['#2193B0', '#6DD5ED'] },
  { id: 'preset:forest', label: 'Forest', colors: ['#134E5E', '#71B280'] },
  { id: 'preset:rosegold', label: 'Rose Gold', colors: ['#B76E79', '#E8C4C4'] },
  { id: 'preset:violet', label: 'Violet Dream', colors: ['#7F00FF', '#E100FF'] },
  { id: 'preset:mono', label: 'Charcoal', colors: ['#232526', '#414345'] },
  { id: 'preset:citrus', label: 'Citrus', colors: ['#F09819', '#EDDE5D'] },
];

export function findPreset(id: string | null | undefined): ChatWallpaperPreset | undefined {
  return CHAT_WALLPAPER_PRESETS.find(p => p.id === id);
}

export function isPresetId(value: string | null | undefined): boolean {
  return !!value && value.startsWith('preset:');
}
