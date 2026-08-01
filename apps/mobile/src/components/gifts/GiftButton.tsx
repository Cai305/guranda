import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import GiftSheet, { GiftCatalogItem } from './GiftSheet';

interface Props {
  recipientId: string;
  recipientName: string;
  context: 'live' | 'game' | 'video' | 'story';
  contextId?: string;
  size?: number;
  style?: ViewStyle;
  onSent?: (item: GiftCatalogItem) => void;
}

// A small floating gift icon reused on every surface that supports
// gifting — Live streams and every game screen. Tapping it opens the
// shared GiftSheet targeting whichever recipient this instance was given.
export default function GiftButton({ recipientId, recipientName, context, contextId, size = 34, style, onSent }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }, style]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="gift" size={size * 0.52} color={COLORS.gold} />
      </TouchableOpacity>
      <GiftSheet
        visible={open}
        onClose={() => setOpen(false)}
        recipientId={recipientId}
        recipientName={recipientName}
        context={context}
        contextId={contextId}
        onSent={onSent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
