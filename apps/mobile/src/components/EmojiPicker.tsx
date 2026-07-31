import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, RADIUS } from '../theme';

// Plain Unicode — no native emoji-keyboard dependency needed, works
// identically on web and native. A curated common set rather than the full
// Unicode emoji table (thousands of entries) keeps this fast and simple.
const EMOJI_GROUPS: { label: string; emoji: string[] }[] = [
  {
    label: 'Smileys',
    emoji: ['😀', '😂', '🤣', '😊', '😍', '😘', '😉', '😎', '🤔', '😅', '😭', '😢', '😡', '🥳', '😴', '🤗', '🙄', '😬', '🤯', '🥺'],
  },
  {
    label: 'Gestures',
    emoji: ['👍', '👎', '👏', '🙌', '🙏', '💪', '✌️', '🤝', '👋', '🤙', '👌', '✊', '🫡', '🤞', '🫶'],
  },
  {
    label: 'Hearts',
    emoji: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💔', '😻', '💯'],
  },
  {
    label: 'Fun',
    emoji: ['🔥', '🎉', '✨', '⭐', '🎂', '🎁', '☕', '🍕', '🍺', '⚽', '🏆', '💰', '🚗', '📸', '🎵'],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: Props) {
  return (
    <View style={styles.panel}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {EMOJI_GROUPS.map(group => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.grid}>
              {group.emoji.map(e => (
                <TouchableOpacity key={e} style={styles.cell} onPress={() => onSelect(e)} activeOpacity={0.6}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 220,
    backgroundColor: COLORS.surfaceElevated || COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  group: { marginBottom: 8 },
  groupLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md || 10,
  },
  emojiText: { fontSize: 24 },
});
