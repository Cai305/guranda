import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';

const EMOJI = [
  '🔥', '✨', '😂', '❤️', '👀', '🎉', '💯', '📸', '🌟', '👏', '😍', '🙌',
  '🎊', '🥳', '💜', '⚡', '🌈', '🎈', '🏆', '💎', '🎵', '📍', '👑', '🚀',
];

type Props = { onPick: (emoji: string) => void };

export default function StickerPanel({ onPick }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {EMOJI.map((e, i) => (
        <TouchableOpacity key={i} style={styles.cell} onPress={() => onPick(e)}>
          <Text style={styles.emoji}>{e}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 4 },
  cell: { width: '16.66%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 30 },
});
