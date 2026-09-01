import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useThemedStyles } from '../theme/useThemedStyles';

// Shimmering placeholder matching VideoCard's non-compact layout exactly:
// full-width 16:9 thumbnail block, then an avatar circle + two text bars.
// Mirrors VideoCard.tsx's `thumb`/`infoRow`/`avatar`/`title`/`meta` sizing so
// swapping a skeleton for a real card causes no layout shift.
export default function VideoCardSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const styles = useThemedStyles(({ COLORS }) => ({
    card: { marginBottom: 8 },
    thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: COLORS.surfaceElevated },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceElevated, flexShrink: 0 },
    textBlock: { flex: 1, gap: 8, paddingTop: 2 },
    titleBar: { height: 12, borderRadius: 4, backgroundColor: COLORS.surfaceElevated, width: '85%' },
    metaBar: { height: 10, borderRadius: 4, backgroundColor: COLORS.surfaceElevated, width: '45%' },
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.thumb, { opacity: pulse }]} />
      <View style={styles.infoRow}>
        <Animated.View style={[styles.avatar, { opacity: pulse }]} />
        <View style={styles.textBlock}>
          <Animated.View style={[styles.titleBar, { opacity: pulse }]} />
          <Animated.View style={[styles.metaBar, { opacity: pulse }]} />
        </View>
      </View>
    </View>
  );
}
