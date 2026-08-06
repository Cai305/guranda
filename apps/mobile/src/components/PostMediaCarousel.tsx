import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import type { PostMediaDto } from '@mxit2/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_HEIGHT = 320;
// Cheap opaque placeholder — expo-image decodes/paints this instantly while
// the real network image is still fetching, instead of the row popping in
// blank. A real blurhash per-image would need generating one at upload time
// (not done today); this flat tone is the honest middle ground until then.
const BLUR_PLACEHOLDER = { blurhash: 'L4KUt7~q00Rj~qM{9FRj00Rj9FIU' };

function MediaItem({ item, isActive, height }: { item: PostMediaDto; isActive: boolean; height: number }) {
  const isVideo = item.type === 'VIDEO';
  // Source stays null until this exact page is the active/visible one —
  // the player object itself always exists (hook order must stay stable),
  // but no network fetch or decode happens for off-screen pages.
  const player = useVideoPlayer(isVideo && isActive ? item.url : null, (p) => {
    p.loop = false;
  });

  if (isVideo) {
    return (
      <View style={[styles.item, { width: SCREEN_WIDTH - 32 - 32, height, backgroundColor: '#0A0A0F' }]}>
        {isActive ? (
          <VideoView style={StyleSheet.absoluteFill} player={player} contentFit="cover" nativeControls />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.videoPlaceholder]}>
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
          </View>
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: item.url }}
      placeholder={BLUR_PLACEHOLDER}
      placeholderContentFit="cover"
      transition={150}
      cachePolicy="disk"
      recyclingKey={item.url}
      style={[styles.item, { width: SCREEN_WIDTH - 32 - 32, height }]}
      contentFit="cover"
    />
  );
}

type Props = {
  media: PostMediaDto[];
  /** Whether the parent post row is currently visible in the feed's viewport — gates video playback. */
  active: boolean;
  height?: number;
};

export default function PostMediaCarousel({ media, active, height = DEFAULT_HEIGHT }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageWidth = SCREEN_WIDTH - 32 - 32;

  if (!media.length) return null;

  if (media.length === 1) {
    return (
      <View style={[styles.wrap, { height }]}>
        <MediaItem item={media[0]} isActive={active} height={height} />
      </View>
    );
  }

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (next !== pageIndex) setPageIndex(next);
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
      >
        {media.map((m, i) => (
          <MediaItem key={m.id ?? `${m.url}_${i}`} item={m} isActive={active && i === pageIndex} height={height} />
        ))}
      </ScrollView>
      <View style={styles.dotsRow} pointerEvents="none">
        {media.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === pageIndex ? '#fff' : 'rgba(255,255,255,0.4)' },
            ]}
          />
        ))}
      </View>
      <View style={styles.countBadge} pointerEvents="none">
        <View style={styles.countBadgeInner}>
          <Ionicons name="images" size={11} color="#fff" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
  },
  item: {
    backgroundColor: '#0A0A0F',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  countBadgeInner: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 5,
  },
});
