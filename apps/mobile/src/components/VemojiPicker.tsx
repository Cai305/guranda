import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { VEMOJI_CATALOG, VemojiType } from '@mxit2/types';
import { useThemedStyles } from '../theme/useThemedStyles';
import CustomEmoji from './live/CustomEmoji';

interface Props {
  onSelect: (type: VemojiType) => void;
}

// Guranda's own hand-drawn emoji set — same 8 faces used for live-stream
// reactions (components/live/CustomEmoji.tsx), now sendable as chat messages.
export default function VemojiPicker({ onSelect }: Props) {
  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    panel: {
      height: 220,
      backgroundColor: COLORS.surfaceElevated || COLORS.surface,
      borderTopWidth: 1,
      borderColor: COLORS.border,
      padding: 12,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    cell: {
      width: 62,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      borderRadius: RADIUS.md || 10,
    },
    label: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  }));

  return (
    <View style={styles.panel}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {VEMOJI_CATALOG.map(v => (
          <TouchableOpacity key={v.type} style={styles.cell} onPress={() => onSelect(v.type)} activeOpacity={0.7}>
            <CustomEmoji type={v.type} size={44} />
            <Text style={styles.label}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
