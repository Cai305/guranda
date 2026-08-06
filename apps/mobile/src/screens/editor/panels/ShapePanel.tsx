import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { ShapeKind } from '../types';

const COLORS_SWATCHES = ['#FFFFFF', '#0A0A0F', '#FF3B7F', '#FF9F1C', '#20C997', '#3B82F6', '#8B5CF6', '#F472B6'];

const SHAPES: { key: ShapeKind; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'rect', icon: 'square-outline', label: 'Block' },
  { key: 'circle', icon: 'ellipse-outline', label: 'Circle' },
  { key: 'line', icon: 'remove-outline', label: 'Divider' },
];

type Props = {
  onAdd: (shapeType: ShapeKind, color: string) => void;
};

export default function ShapePanel({ onAdd }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [color, setColor] = useState(COLORS_SWATCHES[2]);

  return (
    <View style={styles.wrap}>
      <View style={styles.shapeRow}>
        {SHAPES.map((s) => (
          <TouchableOpacity key={s.key} style={[styles.shapeBtn, { backgroundColor: COLORS.surfaceElevated }]} onPress={() => onAdd(s.key, color)}>
            <Ionicons name={s.icon} size={26} color={color} />
            <Text style={[styles.shapeLabel, { color: COLORS.textMuted }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.swatchRow}>
        {COLORS_SWATCHES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c, borderColor: color === c ? COLORS.primary : 'rgba(255,255,255,0.15)', borderWidth: color === c ? 3 : 1 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingHorizontal: 16 },
  shapeRow: { flexDirection: 'row', gap: 10 },
  shapeBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 14 },
  shapeLabel: { fontSize: 11, fontWeight: '600' },
  swatchRow: { flexDirection: 'row', gap: 10 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
});
