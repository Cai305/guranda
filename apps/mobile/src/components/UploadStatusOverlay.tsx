import React, { useSyncExternalStore } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import {
  subscribeUploadStatus,
  getUploadStatusSnapshot,
  UploadStatusItem,
} from '../utils/uploadStatusStore';

const ICONS: Record<UploadStatusItem['state'], keyof typeof Ionicons.glyphMap> = {
  uploading: 'cloud-upload-outline',
  success: 'checkmark-circle',
  warning: 'warning',
  error: 'close-circle',
};

// Mounted once at the app root (same pattern as IncomingCallOverlay /
// AiFloatingOrb) so every upload — from any of the 15+ screens that call
// uploadMedia()/uploadImage(), plus VideoUploadScreen's own upload — gets a
// progress bar while it runs and a result toast when it's done, with zero
// per-screen wiring required.
export default function UploadStatusOverlay() {
  const { theme } = useTheme();
  const { COLORS } = theme;

  const COLORS_BY_STATE: Record<UploadStatusItem['state'], string> = {
    uploading: COLORS.primary,
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    stack: {
      position: 'absolute',
      top: 50,
      left: SPACING.lg,
      right: SPACING.lg,
      gap: 8,
      zIndex: 2000,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: COLORS.surfaceElevated || COLORS.surface,
      borderWidth: 1,
      borderRadius: RADIUS.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    textCol: { flex: 1, gap: 6 },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: COLORS.primary,
      borderRadius: 2,
    },
    percent: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  }));

  const items = useSyncExternalStore(subscribeUploadStatus, getUploadStatusSnapshot);

  if (items.length === 0) return null;

  return (
    <View style={styles.stack} pointerEvents="box-none">
      {items.map((item) => (
        <View key={item.id} style={[styles.card, { borderColor: `${COLORS_BY_STATE[item.state]}55` }]}>
          <Ionicons name={ICONS[item.state]} size={18} color={COLORS_BY_STATE[item.state]} />
          <View style={styles.textCol}>
            <Text style={styles.label} numberOfLines={1}>
              {item.state === 'uploading' ? item.label : item.message ?? item.label}
            </Text>
            {item.state === 'uploading' && (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, item.percent))}%` }]} />
              </View>
            )}
          </View>
          {item.state === 'uploading' && (
            <Text style={styles.percent}>{Math.round(item.percent)}%</Text>
          )}
        </View>
      ))}
    </View>
  );
}
