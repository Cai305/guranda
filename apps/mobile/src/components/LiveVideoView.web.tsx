import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { Track } from 'livekit-client';
import { useThemedStyles } from '../theme/useThemedStyles';

// Web-only real video surface. Any LiveKit Track (local or remote)
// exposes attach()/detach() which bind it straight to an
// HTMLVideoElement — react-native-web lets us drop a raw DOM tag
// into the tree for this since there's no RN equivalent.
const Video: any = 'video';

interface Props {
  track?: Track | null;
  muted?: boolean;
  mirror?: boolean;
}

export default function LiveVideoView({ track, muted, mirror }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const styles = useThemedStyles(({ COLORS }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      overflow: 'hidden',
    },
  }));

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: mirror ? 'scaleX(-1)' : undefined,
          backgroundColor: '#000',
        }}
      />
    </View>
  );
}
