// ============================================================
// Guranda Design System
// "One Identity. One Economy. One Life."
// Dark-first, premium, minimal, futuristic.
// ============================================================

export const BRAND = {
  name: 'Guranda',
  tagline: 'One Identity. One Economy. One Life.',
  scheme: 'lifeos://',
  webUrl: 'https://lifeos.app',
};

export const COLORS = {
  // Core brand
  primary: '#8B5CF6',        // Guranda violet
  primaryDeep: '#6D28D9',
  secondary: '#22D3EE',      // aurora cyan
  accent: '#F472B6',
  gold: '#FBBF24',

  // Surfaces (dark by default)
  background: '#07070C',
  surface: '#12121A',
  surfaceElevated: '#1A1A26',
  glass: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',

  // Content
  text: '#FFFFFF',
  textMuted: '#9494AB',

  // Feedback
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
  border: '#22222E',
};

// Gradient pairs for hero cards, module tiles and buttons
export const GRADIENTS: Record<string, [string, string]> = {
  primary: ['#8B5CF6', '#6366F1'],
  aurora: ['#22D3EE', '#8B5CF6'],
  wallet: ['#4C1D95', '#7C3AED'],
  sunset: ['#F472B6', '#FB923C'],
  emerald: ['#10B981', '#22D3EE'],
  midnight: ['#1E1B4B', '#312E81'],
  crimson: ['#F87171', '#F472B6'],
  golden: ['#F59E0B', '#FBBF24'],
  ocean: ['#0EA5E9', '#6366F1'],
  blue: ['#3B82F6', '#0EA5E9'],
  card: ['#1A1A26', '#12121A'],
  live: ['#EF4444', '#EC4899'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const TYPOGRAPHY = {
  display: { fontSize: 40, fontWeight: '800' as const, color: COLORS.text, letterSpacing: -1 },
  h1: { fontSize: 32, fontWeight: '700' as const, color: COLORS.text, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '600' as const, color: COLORS.text, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '500' as const, color: COLORS.text },
  h4: { fontSize: 18, fontWeight: '500' as const, color: COLORS.text },
  body1: { fontSize: 16, fontWeight: '400' as const, color: COLORS.text },
  body2: { fontSize: 14, fontWeight: '400' as const, color: COLORS.textMuted },
  caption: { fontSize: 12, fontWeight: '500' as const, color: COLORS.textMuted },
  label: { fontSize: 13, fontWeight: '600' as const, color: COLORS.textMuted, textTransform: 'uppercase' as const, letterSpacing: 1 },
  button: { fontSize: 15, fontWeight: '700' as const, color: COLORS.text, letterSpacing: 0.5 },
};

// Shared glassmorphism card style
export const GLASS_CARD = {
  backgroundColor: COLORS.glass,
  borderWidth: 1,
  borderColor: COLORS.glassBorder,
  borderRadius: RADIUS.lg,
};

export const SHADOW = {
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};
