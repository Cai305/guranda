// ============================================================
// Guranda Theme Gallery
// Six selectable themes. Each varies color, radius, spacing,
// typography and shadow/glow treatment — not just hue.
// ============================================================
import {
  BRAND as ORIGINAL_BRAND,
  COLORS as ORIGINAL_COLORS,
  GRADIENTS as ORIGINAL_GRADIENTS,
  SPACING as ORIGINAL_SPACING,
  RADIUS as ORIGINAL_RADIUS,
  TYPOGRAPHY as ORIGINAL_TYPOGRAPHY,
  GLASS_CARD as ORIGINAL_GLASS_CARD,
  SHADOW as ORIGINAL_SHADOW,
} from './index';

export type ThemeColors = {
  primary: string;
  primaryDeep: string;
  secondary: string;
  accent: string;
  gold: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  glass: string;
  glassBorder: string;
  text: string;
  textMuted: string;
  success: string;
  error: string;
  warning: string;
  border: string;
};

export type ThemeGradients = Record<string, [string, string]>;

export type ThemeSpacing = { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
export type ThemeRadius = { sm: number; md: number; lg: number; xl: number; pill: number };

type TextStyle = {
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700' | '800' | '900';
  color: string;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

export type ThemeTypography = {
  display: TextStyle;
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  body1: TextStyle;
  body2: TextStyle;
  caption: TextStyle;
  label: TextStyle;
  button: TextStyle;
};

export type ThemeShadow = {
  glow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export type ThemeGlassCard = {
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
};

export type ThemeTokens = {
  id: ThemeId;
  name: string;
  description: string;
  BRAND: typeof ORIGINAL_BRAND;
  COLORS: ThemeColors;
  GRADIENTS: ThemeGradients;
  SPACING: ThemeSpacing;
  RADIUS: ThemeRadius;
  TYPOGRAPHY: ThemeTypography;
  GLASS_CARD: ThemeGlassCard;
  SHADOW: ThemeShadow;
};

export type ThemeId = 'original' | 'midnightNeutral' | 'sunriseLight' | 'highContrast' | 'playfulPop' | 'minimalMono';

// ------------------------------------------------------------
// 1. Original — today's exact values, untouched.
// ------------------------------------------------------------
const original: ThemeTokens = {
  id: 'original',
  name: 'Original',
  description: 'Violet & cyan, glass-morphism, glow, pill buttons — the signature Guranda look.',
  BRAND: ORIGINAL_BRAND,
  COLORS: ORIGINAL_COLORS,
  GRADIENTS: ORIGINAL_GRADIENTS,
  SPACING: ORIGINAL_SPACING,
  RADIUS: ORIGINAL_RADIUS,
  TYPOGRAPHY: ORIGINAL_TYPOGRAPHY,
  GLASS_CARD: ORIGINAL_GLASS_CARD,
  SHADOW: ORIGINAL_SHADOW,
};

// ------------------------------------------------------------
// 2. Midnight Neutral — the shadcn-style flat neutral palette
//    proven in the WalletScreen proof-of-concept: no gradients,
//    no glow, tight radius, hairline borders.
// ------------------------------------------------------------
const midnightNeutralColors: ThemeColors = {
  primary: '#FAFAFA',
  primaryDeep: '#E4E4E7',
  secondary: '#A1A1AA',
  accent: '#FAFAFA',
  gold: '#D4B106',
  background: '#0A0A0A',
  surface: '#18181B',
  surfaceElevated: '#202023',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.1)',
  text: '#FAFAFA',
  textMuted: '#8A8A8E',
  success: '#4ADE80',
  error: '#EF4444',
  warning: '#D4B106',
  border: 'rgba(255,255,255,0.1)',
};
const midnightNeutralFlat = (hex: string): [string, string] => [hex, hex];
const midnightNeutral: ThemeTokens = {
  id: 'midnightNeutral',
  name: 'Midnight Neutral',
  description: 'Flat, near-black, hairline borders — no gradients, no glow.',
  BRAND: ORIGINAL_BRAND,
  COLORS: midnightNeutralColors,
  GRADIENTS: {
    primary: midnightNeutralFlat('#27272A'),
    aurora: midnightNeutralFlat('#27272A'),
    wallet: midnightNeutralFlat('#18181B'),
    sunset: midnightNeutralFlat('#27272A'),
    emerald: midnightNeutralFlat('#18181B'),
    midnight: midnightNeutralFlat('#18181B'),
    crimson: midnightNeutralFlat('#27272A'),
    golden: midnightNeutralFlat('#27272A'),
    ocean: midnightNeutralFlat('#27272A'),
    blue: midnightNeutralFlat('#27272A'),
    card: midnightNeutralFlat('#18181B'),
    live: ['#7F1D1D', '#991B1B'],
  },
  SPACING: { xs: 4, sm: 8, md: 12, lg: 18, xl: 24, xxl: 32 },
  RADIUS: { sm: 6, md: 8, lg: 10, xl: 12, pill: 10 },
  TYPOGRAPHY: {
    display: { fontSize: 40, fontWeight: '600', color: midnightNeutralColors.text, letterSpacing: -0.5 },
    h1: { fontSize: 32, fontWeight: '600', color: midnightNeutralColors.text, letterSpacing: -0.3 },
    h2: { fontSize: 24, fontWeight: '600', color: midnightNeutralColors.text },
    h3: { fontSize: 20, fontWeight: '500', color: midnightNeutralColors.text },
    h4: { fontSize: 18, fontWeight: '500', color: midnightNeutralColors.text },
    body1: { fontSize: 16, fontWeight: '400', color: midnightNeutralColors.text },
    body2: { fontSize: 14, fontWeight: '400', color: midnightNeutralColors.textMuted },
    caption: { fontSize: 12, fontWeight: '500', color: midnightNeutralColors.textMuted },
    label: { fontSize: 13, fontWeight: '600', color: midnightNeutralColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    button: { fontSize: 15, fontWeight: '600', color: midnightNeutralColors.text },
  },
  GLASS_CARD: {
    backgroundColor: midnightNeutralColors.surface,
    borderWidth: 1,
    borderColor: midnightNeutralColors.border,
    borderRadius: 10,
  },
  SHADOW: {
    glow: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  },
};

// ------------------------------------------------------------
// 3. Sunrise Light — the light mode AppearanceScreen used to
//    promise and refuse. Warm, soft, subtle drop shadows.
// ------------------------------------------------------------
const sunriseLightColors: ThemeColors = {
  primary: '#F59E0B',
  primaryDeep: '#D97706',
  secondary: '#06B6D4',
  accent: '#EC4899',
  gold: '#F59E0B',
  background: '#FFFBF5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF7ED',
  glass: 'rgba(0,0,0,0.03)',
  glassBorder: 'rgba(0,0,0,0.08)',
  text: '#1C1917',
  textMuted: '#78716C',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
  border: '#E7E5E4',
};
const sunriseLight: ThemeTokens = {
  id: 'sunriseLight',
  name: 'Sunrise Light',
  description: 'Warm light background, soft pastel gradients, subtle shadows.',
  BRAND: ORIGINAL_BRAND,
  COLORS: sunriseLightColors,
  GRADIENTS: {
    primary: ['#FDE68A', '#FCA5A5'],
    aurora: ['#A7F3D0', '#93C5FD'],
    wallet: ['#FBCFE8', '#FDE68A'],
    sunset: ['#FED7AA', '#FCA5A5'],
    emerald: ['#A7F3D0', '#6EE7B7'],
    midnight: ['#E0E7FF', '#C7D2FE'],
    crimson: ['#FECACA', '#FDA4AF'],
    golden: ['#FDE68A', '#FCD34D'],
    ocean: ['#BAE6FD', '#93C5FD'],
    blue: ['#BFDBFE', '#93C5FD'],
    card: ['#FFFFFF', '#FFF7ED'],
    live: ['#FCA5A5', '#F87171'],
  },
  SPACING: { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 },
  RADIUS: { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 },
  TYPOGRAPHY: {
    display: { fontSize: 40, fontWeight: '800', color: sunriseLightColors.text, letterSpacing: -1 },
    h1: { fontSize: 32, fontWeight: '700', color: sunriseLightColors.text, letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '600', color: sunriseLightColors.text, letterSpacing: -0.3 },
    h3: { fontSize: 20, fontWeight: '500', color: sunriseLightColors.text },
    h4: { fontSize: 18, fontWeight: '500', color: sunriseLightColors.text },
    body1: { fontSize: 16, fontWeight: '400', color: sunriseLightColors.text },
    body2: { fontSize: 14, fontWeight: '400', color: sunriseLightColors.textMuted },
    caption: { fontSize: 12, fontWeight: '500', color: sunriseLightColors.textMuted },
    label: { fontSize: 13, fontWeight: '600', color: sunriseLightColors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    button: { fontSize: 15, fontWeight: '700', color: sunriseLightColors.text, letterSpacing: 0.5 },
  },
  GLASS_CARD: {
    backgroundColor: sunriseLightColors.surface,
    borderWidth: 1,
    borderColor: sunriseLightColors.border,
    borderRadius: 24,
  },
  SHADOW: {
    glow: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  },
};

// ------------------------------------------------------------
// 4. High Contrast — pure black/white, flat, no glow, roomier
//    spacing and bumped-up type for legibility.
// ------------------------------------------------------------
const highContrastColors: ThemeColors = {
  primary: '#FFFFFF',
  primaryDeep: '#E5E5E5',
  secondary: '#00FFFF',
  accent: '#FFFF00',
  gold: '#FFD700',
  background: '#000000',
  surface: '#000000',
  surfaceElevated: '#111111',
  glass: '#000000',
  glassBorder: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#CCCCCC',
  success: '#00FF00',
  error: '#FF3B3B',
  warning: '#FFFF00',
  border: '#FFFFFF',
};
const highContrastFlat = (hex: string): [string, string] => [hex, hex];
const highContrast: ThemeTokens = {
  id: 'highContrast',
  name: 'High Contrast',
  description: 'Pure black & white, flat colors, thick borders, no glow — built for legibility.',
  BRAND: ORIGINAL_BRAND,
  COLORS: highContrastColors,
  GRADIENTS: {
    primary: highContrastFlat('#FFFFFF'),
    aurora: highContrastFlat('#00FFFF'),
    wallet: highContrastFlat('#FFFFFF'),
    sunset: highContrastFlat('#FFFF00'),
    emerald: highContrastFlat('#00FF00'),
    midnight: highContrastFlat('#FFFFFF'),
    crimson: highContrastFlat('#FF3B3B'),
    golden: highContrastFlat('#FFD700'),
    ocean: highContrastFlat('#00FFFF'),
    blue: highContrastFlat('#00FFFF'),
    card: highContrastFlat('#000000'),
    live: highContrastFlat('#FF3B3B'),
  },
  SPACING: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 48 },
  RADIUS: { sm: 0, md: 2, lg: 4, xl: 6, pill: 8 },
  TYPOGRAPHY: {
    display: { fontSize: 44, fontWeight: '800', color: highContrastColors.text },
    h1: { fontSize: 36, fontWeight: '800', color: highContrastColors.text },
    h2: { fontSize: 28, fontWeight: '700', color: highContrastColors.text },
    h3: { fontSize: 22, fontWeight: '700', color: highContrastColors.text },
    h4: { fontSize: 20, fontWeight: '700', color: highContrastColors.text },
    body1: { fontSize: 18, fontWeight: '600', color: highContrastColors.text },
    body2: { fontSize: 16, fontWeight: '600', color: highContrastColors.textMuted },
    caption: { fontSize: 14, fontWeight: '700', color: highContrastColors.textMuted },
    label: { fontSize: 14, fontWeight: '800', color: highContrastColors.text, textTransform: 'uppercase', letterSpacing: 1 },
    button: { fontSize: 17, fontWeight: '800', color: highContrastColors.text },
  },
  GLASS_CARD: {
    backgroundColor: highContrastColors.background,
    borderWidth: 2,
    borderColor: highContrastColors.border,
    borderRadius: 4,
  },
  SHADOW: {
    glow: { shadowColor: '#000000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  },
};

// ------------------------------------------------------------
// 5. Playful Pop — saturated, maximal roundness, heavy weights,
//    strong glow, denser spacing with larger touch targets.
// ------------------------------------------------------------
const playfulPopColors: ThemeColors = {
  primary: '#FF6B6B',
  primaryDeep: '#EE5253',
  secondary: '#4ECDC4',
  accent: '#FFD93D',
  gold: '#FFD93D',
  background: '#1A0B2E',
  surface: '#2D1B4E',
  surfaceElevated: '#3D2563',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.15)',
  text: '#FFFFFF',
  textMuted: '#C4B5E8',
  success: '#6BCB77',
  error: '#FF6B6B',
  warning: '#FFD93D',
  border: '#4A2E7A',
};
const playfulPop: ThemeTokens = {
  id: 'playfulPop',
  name: 'Playful Pop',
  description: 'Saturated color, maximal roundness, bold type, strong glow.',
  BRAND: ORIGINAL_BRAND,
  COLORS: playfulPopColors,
  GRADIENTS: {
    primary: ['#FF6B6B', '#4ECDC4'],
    aurora: ['#A29BFE', '#FD79A8'],
    wallet: ['#6C5CE7', '#00CEC9'],
    sunset: ['#FF9F43', '#EE5253'],
    emerald: ['#00B894', '#00CEC9'],
    midnight: ['#6C5CE7', '#341F97'],
    crimson: ['#FF6B6B', '#EE5253'],
    golden: ['#FFD93D', '#FF9F43'],
    ocean: ['#00CEC9', '#0984E3'],
    blue: ['#74B9FF', '#0984E3'],
    card: ['#3D2563', '#2D1B4E'],
    live: ['#FF6B6B', '#FD79A8'],
  },
  SPACING: { xs: 6, sm: 10, md: 14, lg: 24, xl: 32, xxl: 44 },
  RADIUS: { sm: 16, md: 22, lg: 28, xl: 34, pill: 999 },
  TYPOGRAPHY: {
    display: { fontSize: 40, fontWeight: '900', color: playfulPopColors.text, letterSpacing: -1 },
    h1: { fontSize: 32, fontWeight: '800', color: playfulPopColors.text, letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '700', color: playfulPopColors.text },
    h3: { fontSize: 20, fontWeight: '700', color: playfulPopColors.text },
    h4: { fontSize: 18, fontWeight: '600', color: playfulPopColors.text },
    body1: { fontSize: 16, fontWeight: '500', color: playfulPopColors.text },
    body2: { fontSize: 14, fontWeight: '500', color: playfulPopColors.textMuted },
    caption: { fontSize: 12, fontWeight: '600', color: playfulPopColors.textMuted },
    label: { fontSize: 13, fontWeight: '700', color: playfulPopColors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    button: { fontSize: 15, fontWeight: '800', color: playfulPopColors.text, letterSpacing: 0.5 },
  },
  GLASS_CARD: {
    backgroundColor: playfulPopColors.glass,
    borderWidth: 1.5,
    borderColor: playfulPopColors.glassBorder,
    borderRadius: 28,
  },
  SHADOW: {
    glow: { shadowColor: playfulPopColors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
  },
};

// ------------------------------------------------------------
// 6. Minimal Mono — near-grayscale with one small accent, sharp
//    corners, flat fills, no glow, compact spacing and type.
// ------------------------------------------------------------
const minimalMonoColors: ThemeColors = {
  primary: '#3B82F6',
  primaryDeep: '#2563EB',
  secondary: '#9CA3AF',
  accent: '#3B82F6',
  gold: '#9CA3AF',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F4F5',
  glass: 'rgba(0,0,0,0.02)',
  glassBorder: 'rgba(0,0,0,0.08)',
  text: '#18181B',
  textMuted: '#71717A',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#E4E4E7',
};
const minimalMonoFlat = (hex: string): [string, string] => [hex, hex];
const minimalMono: ThemeTokens = {
  id: 'minimalMono',
  name: 'Minimal Mono',
  description: 'Near-grayscale, sharp corners, flat fills, no shadow — as little design as possible.',
  BRAND: ORIGINAL_BRAND,
  COLORS: minimalMonoColors,
  GRADIENTS: {
    primary: minimalMonoFlat('#F4F4F5'),
    aurora: minimalMonoFlat('#E4E4E7'),
    wallet: minimalMonoFlat('#F4F4F5'),
    sunset: minimalMonoFlat('#F4F4F5'),
    emerald: minimalMonoFlat('#F4F4F5'),
    midnight: minimalMonoFlat('#E4E4E7'),
    crimson: minimalMonoFlat('#F4F4F5'),
    golden: minimalMonoFlat('#F4F4F5'),
    ocean: minimalMonoFlat('#F4F4F5'),
    blue: ['#DBEAFE', '#DBEAFE'],
    card: ['#FFFFFF', '#FAFAFA'],
    live: ['#FECACA', '#FECACA'],
  },
  SPACING: { xs: 3, sm: 6, md: 10, lg: 16, xl: 22, xxl: 30 },
  RADIUS: { sm: 2, md: 4, lg: 6, xl: 8, pill: 6 },
  TYPOGRAPHY: {
    display: { fontSize: 32, fontWeight: '600', color: minimalMonoColors.text },
    h1: { fontSize: 26, fontWeight: '600', color: minimalMonoColors.text },
    h2: { fontSize: 20, fontWeight: '500', color: minimalMonoColors.text },
    h3: { fontSize: 17, fontWeight: '500', color: minimalMonoColors.text },
    h4: { fontSize: 15, fontWeight: '500', color: minimalMonoColors.text },
    body1: { fontSize: 14, fontWeight: '400', color: minimalMonoColors.text },
    body2: { fontSize: 13, fontWeight: '400', color: minimalMonoColors.textMuted },
    caption: { fontSize: 11, fontWeight: '400', color: minimalMonoColors.textMuted },
    label: { fontSize: 11, fontWeight: '500', color: minimalMonoColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    button: { fontSize: 13, fontWeight: '500', color: minimalMonoColors.text },
  },
  GLASS_CARD: {
    backgroundColor: minimalMonoColors.surface,
    borderWidth: 1,
    borderColor: minimalMonoColors.border,
    borderRadius: 6,
  },
  SHADOW: {
    glow: { shadowColor: '#000000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  },
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  original,
  midnightNeutral,
  sunriseLight,
  highContrast,
  playfulPop,
  minimalMono,
};

export const THEME_LIST: ThemeTokens[] = [original, midnightNeutral, sunriseLight, highContrast, playfulPop, minimalMono];

export const DEFAULT_THEME_ID: ThemeId = 'original';
