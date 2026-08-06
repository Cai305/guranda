import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { FILTER_PRESETS } from '../filters';

type Props = {
  selectedKey: string;
  onSelect: (key: string) => void;
};

export default function FiltersPanel({ selectedKey, onSelect }: Props) {
  const { theme } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FILTER_PRESETS.map((f) => {
        const active = f.key === selectedKey;
        return (
          <TouchableOpacity key={f.key} onPress={() => onSelect(f.key)} style={styles.item}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: theme.COLORS.surfaceElevated, borderColor: active ? theme.COLORS.primary : 'transparent' },
              ]}
            />
            <Text style={[styles.label, { color: active ? theme.COLORS.primary : theme.COLORS.textMuted }]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 14, flexDirection: 'row' },
  item: { alignItems: 'center', gap: 6 },
  swatch: { width: 52, height: 52, borderRadius: 12, borderWidth: 2 },
  label: { fontSize: 12, fontWeight: '600' },
});
