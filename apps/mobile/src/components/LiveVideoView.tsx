import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../theme/useThemedStyles';

// Native fallback — real on-device camera streaming isn't wired up
// yet (needs @livekit/react-native + a custom dev client, which is
// out of scope for this pass). Same icon placeholder as before, so
// native never shows a blank screen.
interface Props {
  track?: unknown;
  muted?: boolean;
  mirror?: boolean;
  icon?: string;
}

export default function LiveVideoView({ icon = 'radio' }: Props) {
  const styles = useThemedStyles(({ COLORS }) => ({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
    },
  }));

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={64} color="rgba(255,255,255,0.3)" />
    </View>
  );
}
