import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Caveat_600SemiBold, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import type { FontKey } from './types';

export function useEditorFonts() {
  return useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Poppins_600SemiBold,
    Poppins_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    BebasNeue_400Regular,
    Caveat_600SemiBold,
    Caveat_700Bold,
    Oswald_500Medium,
    Oswald_700Bold,
  });
}

export type FontOption = {
  key: FontKey;
  label: string;
  hint: string;
  /** Family used when a layer is not explicitly bold */
  regular: string;
  /** Family used when a layer is bold */
  bold: string;
  /** Reasonable default weight for a fresh layer of this family */
  defaultBold: boolean;
  /** Preview letter-spacing nudge — condensed/display faces read better tightened or loosened */
  letterSpacing?: number;
};

export const FONT_OPTIONS: FontOption[] = [
  { key: 'inter', label: 'Modern', hint: 'Inter', regular: 'Inter_400Regular', bold: 'Inter_700Bold', defaultBold: true },
  { key: 'poppins', label: 'Rounded', hint: 'Poppins', regular: 'Poppins_600SemiBold', bold: 'Poppins_700Bold', defaultBold: true },
  { key: 'playfair', label: 'Elegant', hint: 'Playfair Display', regular: 'PlayfairDisplay_600SemiBold', bold: 'PlayfairDisplay_700Bold', defaultBold: false },
  { key: 'bebas', label: 'Impact', hint: 'Bebas Neue', regular: 'BebasNeue_400Regular', bold: 'BebasNeue_400Regular', defaultBold: false, letterSpacing: 1.5 },
  { key: 'caveat', label: 'Script', hint: 'Caveat', regular: 'Caveat_600SemiBold', bold: 'Caveat_700Bold', defaultBold: false },
  { key: 'oswald', label: 'Condensed', hint: 'Oswald', regular: 'Oswald_500Medium', bold: 'Oswald_700Bold', defaultBold: true },
];

export function resolveFontFamily(key: FontKey, bold: boolean): string {
  const opt = FONT_OPTIONS.find((f) => f.key === key) ?? FONT_OPTIONS[0];
  return bold ? opt.bold : opt.regular;
}

export function fontLetterSpacing(key: FontKey): number | undefined {
  return FONT_OPTIONS.find((f) => f.key === key)?.letterSpacing;
}
