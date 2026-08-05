import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type CardSuit = 'S' | 'H' | 'D' | 'C';

interface PlayingCardProps {
  suit?: CardSuit;
  rank?: number; // 1 (ace) - 13 (king)
  isJoker?: boolean;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const SUIT_GLYPH: Record<CardSuit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

const SIZES = {
  sm: { width: 40, height: 56, fontSize: 14, glyphSize: 16 },
  md: { width: 56, height: 78, fontSize: 18, glyphSize: 22 },
  lg: { width: 74, height: 104, fontSize: 24, glyphSize: 30 },
};

export default function PlayingCard({
  suit,
  rank,
  isJoker,
  faceDown,
  size = 'md',
  selected,
  onPress,
  style,
}: PlayingCardProps) {
  const dims = SIZES[size];
  const isRed = suit === 'H' || suit === 'D';
  const rankLabel = isJoker ? '★' : rank !== undefined ? (RANK_LABEL[rank] ?? String(rank)) : '';
  const glyph = suit ? SUIT_GLYPH[suit] : '';

  const styles = useThemedStyles(({ RADIUS }) => ({
    card: {
      backgroundColor: '#FAFAFA',
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    selected: {
      borderColor: '#8B5CF6',
      borderWidth: 2,
      marginTop: -8,
    },
    jokerCard: {
      backgroundColor: '#F5F0FF',
    },
    cornerText: { fontWeight: '800' },
    glyph: { fontWeight: '700' },
    faceDown: {
      backgroundColor: '#4C1D95',
      borderColor: 'rgba(255,255,255,0.2)',
      overflow: 'hidden',
    },
    faceDownPattern: {
      width: '70%',
      height: '70%',
      borderRadius: RADIUS.sm,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
    },
  }));

  const content = faceDown ? (
    <View style={[styles.card, styles.faceDown, { width: dims.width, height: dims.height }]}>
      <View style={styles.faceDownPattern} />
    </View>
  ) : (
    <View
      style={[
        styles.card,
        { width: dims.width, height: dims.height },
        selected && styles.selected,
        isJoker && styles.jokerCard,
      ]}
    >
      <Text style={[styles.cornerText, { fontSize: dims.fontSize, color: isJoker ? '#8B5CF6' : isRed ? '#DC2626' : '#111' }]}>
        {rankLabel}
      </Text>
      {!isJoker && (
        <Text style={[styles.glyph, { fontSize: dims.glyphSize, color: isRed ? '#DC2626' : '#111' }]}>{glyph}</Text>
      )}
      {isJoker && <Text style={[styles.glyph, { fontSize: dims.glyphSize, color: '#8B5CF6' }]}>✦</Text>}
    </View>
  );

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}
