import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface Props {
  icon: string;
  label: string;
  senderName: string;
  nonce: number; // bump to re-trigger the animation for a repeat gift
}

// A floating banner that fades in, holds, then fades out whenever a new
// gift lands — used on Live streams and in game screens alike.
export default function GiftToast({ icon, label, senderName, nonce }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (!nonce) return;
    opacity.setValue(0);
    translateY.setValue(-10);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [nonce]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderWidth: 1,
      borderColor: 'rgba(251, 191, 36, 0.5)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md,
      paddingVertical: 8,
    },
    icon: { fontSize: 20 },
    text: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    sender: { color: COLORS.gold, fontWeight: '800' },
  }));

  if (!nonce) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text}>
        <Text style={styles.sender}>{senderName} </Text>
        sent a {label}!
      </Text>
    </Animated.View>
  );
}
