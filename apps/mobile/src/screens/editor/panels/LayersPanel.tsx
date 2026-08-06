import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Layer } from '../types';
import SimpleSlider from '../SimpleSlider';

type Props = {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelect: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
};

function layerIcon(layer: Layer): keyof typeof Ionicons.glyphMap {
  switch (layer.data.kind) {
    case 'text':
      return 'text-outline';
    case 'sticker':
      return 'happy-outline';
    case 'shape':
      return 'shapes-outline';
    case 'image':
      return 'image-outline';
  }
}

function layerLabel(layer: Layer): string {
  switch (layer.data.kind) {
    case 'text':
      return layer.data.text.trim() || 'Text';
    case 'sticker':
      return `Sticker ${layer.data.emoji}`;
    case 'shape':
      return layer.data.shapeType === 'rect' ? 'Rectangle' : layer.data.shapeType === 'circle' ? 'Circle' : 'Line';
    case 'image':
      return layer.data.processedUri ? 'Photo (bg removed)' : 'Photo';
  }
}

export default function LayersPanel({
  layers,
  selectedLayerId,
  onSelect,
  onToggleLock,
  onToggleHidden,
  onChangeOpacity,
  onDuplicate,
  onDelete,
  onMove,
}: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  // Top-most (rendered last / on top) shown first, matching Photoshop/Figma convention.
  const ordered = [...layers].map((l, i) => ({ layer: l, index: i })).reverse();

  if (layers.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="layers-outline" size={22} color={COLORS.textMuted} />
        <Text style={[styles.emptyText, { color: COLORS.textMuted }]}>No layers yet — add text, a sticker, a shape, or a photo</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {ordered.map(({ layer, index }) => {
        const selected = layer.id === selectedLayerId;
        const isTop = index === layers.length - 1;
        const isBottom = index === 0;
        return (
          <TouchableOpacity
            key={layer.id}
            activeOpacity={0.8}
            onPress={() => onSelect(layer.id)}
            style={[
              styles.row,
              { backgroundColor: COLORS.surfaceElevated, borderColor: selected ? COLORS.primary : 'transparent' },
            ]}
          >
            <Ionicons name={layerIcon(layer)} size={18} color={selected ? COLORS.primary : COLORS.text} />
            <Text numberOfLines={1} style={[styles.label, { color: selected ? COLORS.primary : COLORS.text }]}>
              {layerLabel(layer)}
            </Text>

            <View style={styles.opacityWrap}>
              <SimpleSlider value={layer.opacity} min={0.1} max={1} onChange={(v) => onChangeOpacity(layer.id, v)} />
            </View>

            <TouchableOpacity onPress={() => onMove(layer.id, 'up')} disabled={isTop} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="chevron-up" size={16} color={isTop ? COLORS.border : COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onMove(layer.id, 'down')} disabled={isBottom} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="chevron-down" size={16} color={isBottom ? COLORS.border : COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleHidden(layer.id)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name={layer.hidden ? 'eye-off-outline' : 'eye-outline'} size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleLock(layer.id)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name={layer.locked ? 'lock-closed' : 'lock-open-outline'} size={16} color={layer.locked ? COLORS.primary : COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDuplicate(layer.id)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="copy-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(layer.id)} hitSlop={6} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { maxHeight: 240 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  label: { flex: 1, fontSize: 13, fontWeight: '600' },
  opacityWrap: { width: 56 },
  iconBtn: { padding: 3 },
  emptyWrap: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  emptyText: { fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },
});
