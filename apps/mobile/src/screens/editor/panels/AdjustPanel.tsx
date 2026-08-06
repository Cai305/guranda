import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import SimpleSlider from '../SimpleSlider';
import { Adjustments } from '../types';

type Props = {
  adjustments: Adjustments;
  onChange: (a: Adjustments) => void;
};

const ROWS: { key: keyof Adjustments; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
];

export default function AdjustPanel({ adjustments, onChange }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      {ROWS.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={[styles.label, { color: theme.COLORS.text }]}>{row.label}</Text>
          <SimpleSlider
            value={adjustments[row.key]}
            min={-1}
            max={1}
            onChange={(v) => onChange({ ...adjustments, [row.key]: v })}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  row: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
});
