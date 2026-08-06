import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { GRADIENTS } from '../../../theme';

type Props = {
  activeGradient: readonly [string, string] | null;
  hasImage: boolean;
  onPickGradient: (g: [string, string]) => void;
  onPickPhoto: () => void;
  onClear: () => void;
};

const SWATCH_KEYS = Object.keys(GRADIENTS);

export default function BackgroundPanel({ activeGradient, hasImage, onPickGradient, onPickPhoto, onClear }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <TouchableOpacity onPress={onPickPhoto} style={[styles.photoBtn, { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border }]}>
          <Ionicons name="image-outline" size={20} color={COLORS.text} />
          <Text style={[styles.photoLabel, { color: COLORS.text }]}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClear}
          style={[
            styles.swatch,
            styles.transparentSwatch,
            { borderColor: !hasImage && !activeGradient ? COLORS.primary : COLORS.border },
          ]}
        >
          <Ionicons name="close" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {SWATCH_KEYS.map((key) => {
          const g = GRADIENTS[key];
          const isActive = !hasImage && activeGradient?.[0] === g[0] && activeGradient?.[1] === g[1];
          return (
            <TouchableOpacity key={key} onPress={() => onPickGradient(g)} style={[styles.swatch, { borderColor: isActive ? COLORS.primary : 'transparent' }]}>
              <LinearGradient colors={g} style={styles.swatchFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  photoBtn: { width: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  photoLabel: { fontSize: 10, fontWeight: '600' },
  swatch: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  swatchFill: { width: '100%', height: '100%' },
  transparentSwatch: { backgroundColor: 'rgba(128,128,128,0.15)' },
});
