import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { GOOGLE_MAPS_API_KEY } from '../../theme/mapStyle';

// ── A shared location, one-time pin or live-updating ────────────────────
export interface LocationCardData {
  lat: number;
  lng: number;
  label?: string;
  // Live location: `live` stays true until the sender explicitly stops
  // (an edit sets `stopped: true`) or `expiresAt` passes. Each tick is just
  // another edit_message on the same message, reusing the message
  // edit capability rather than a separate live-tracking endpoint.
  live?: boolean;
  expiresAt?: string;
  stopped?: boolean;
}

export const LOCATION_CARD_TAG = '__locationCard';

export function encodeLocationCard(data: LocationCardData): string {
  return JSON.stringify({ [LOCATION_CARD_TAG]: true, ...data });
}

export function decodeLocationCard(content: string): LocationCardData | null {
  try {
    if (!content.includes(LOCATION_CARD_TAG)) return null;
    const parsed = JSON.parse(content);
    if (!parsed[LOCATION_CARD_TAG]) return null;
    const { [LOCATION_CARD_TAG]: _tag, ...rest } = parsed;
    return rest as LocationCardData;
  } catch {
    return null;
  }
}

function staticMapUrl(lat: number, lng: number): string {
  const size = Platform.OS === 'web' ? '300x150' : '300x150';
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=${size}&scale=2&markers=color:0x8B5CF6%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
}

function formatRemaining(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  return `${Math.ceil(mins / 60)}h left`;
}

interface Props {
  location: LocationCardData;
  /** True when the current viewer is the one who shared it — shows the Stop button. */
  isMine?: boolean;
  onStop?: () => void;
}

export default function LocationMiniCard({ location, isMine, onStop }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [, forceTick] = useState(0);
  // Static Maps requests occasionally fail (key not enabled for the Static
  // Maps API, offline, rate-limited) — fall back to a plain pin instead of
  // a broken image rather than leaving a blank/broken box in the chat.
  const [mapFailed, setMapFailed] = useState(false);

  const expired = !!location.expiresAt && new Date(location.expiresAt).getTime() <= Date.now();
  const isLiveActive = !!location.live && !location.stopped && !expired;

  // Re-render once a minute while live so the "Xm left" countdown stays
  // accurate without needing a new message/prop for every tick.
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, [isLiveActive]);

  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    card: {
      backgroundColor: 'rgba(15,15,25,0.97)',
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.25)',
      overflow: 'hidden',
      minWidth: 220,
      maxWidth: 280,
    },
    map: { width: '100%', height: 130, backgroundColor: COLORS.surface },
    liveBadge: {
      position: 'absolute', top: 8, left: 8,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
    liveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    body: { padding: 10, gap: 6 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 13, flex: 1 },
    subText: { color: COLORS.textMuted, fontSize: 11 },
    stopBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.08)',
      borderRadius: RADIUS.pill, paddingVertical: 7, marginTop: 2,
    },
    stopBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },
    openBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)', backgroundColor: 'rgba(139,92,246,0.08)',
      borderRadius: RADIUS.pill, paddingVertical: 7, marginTop: 2,
    },
    openBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  }));

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const remaining = formatRemaining(location.expiresAt);

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.85} onPress={openInMaps}>
        {mapFailed ? (
          <LinearGradient colors={['#4c1d95', '#7c3aed']} style={[styles.map, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="location" size={32} color="rgba(255,255,255,0.85)" />
          </LinearGradient>
        ) : (
          <Image
            source={{ uri: staticMapUrl(location.lat, location.lng) }}
            style={styles.map}
            resizeMode="cover"
            onError={() => setMapFailed(true)}
          />
        )}
        {isLiveActive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={styles.title} numberOfLines={1}>
            {isLiveActive ? 'Live location' : location.stopped ? 'Live location ended' : (location.label || 'Location')}
          </Text>
        </View>
        {isLiveActive && (
          <Text style={styles.subText}>{remaining ? `Updating · ${remaining}` : 'Updating'}</Text>
        )}
        {isMine && isLiveActive && onStop && (
          <TouchableOpacity style={styles.stopBtn} onPress={onStop} activeOpacity={0.8}>
            <Ionicons name="stop-circle-outline" size={14} color="#ef4444" />
            <Text style={styles.stopBtnText}>Stop sharing</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.openBtn} onPress={openInMaps} activeOpacity={0.8}>
          <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
          <Text style={styles.openBtnText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
