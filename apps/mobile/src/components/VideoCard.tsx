import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { API_BASE_URL } from '../utils/api';

export interface VideoMeta {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  duration: number;
  views: number;
  createdAt: string;
  category: string;
  creator: { username: string; profile?: { displayName?: string; avatarUrl?: string } | null };
  _count?: { likes?: number; comments?: number };
  liked?: boolean;
  savedLater?: boolean;
  /** Seconds this user has watched into the video — drives the YouTube-style red progress bar. */
  watchProgress?: number;
}

interface Props {
  video: VideoMeta;
  onPress: (v: VideoMeta) => void;
  onMenuPress?: (v: VideoMeta) => void;
  compact?: boolean;
  menuIcon?: string;
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string) {
  const d = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(d / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  Gaming: ['#7c3aed', '#4c1d95'],
  Music: ['#db2777', '#831843'],
  Education: ['#0284c7', '#0c4a6e'],
  Cooking: ['#d97706', '#78350f'],
  Sports: ['#16a34a', '#14532d'],
  Comedy: ['#ea580c', '#7c2d12'],
  Technology: ['#0891b2', '#164e63'],
  Fashion: ['#9333ea', '#581c87'],
  Travel: ['#2563eb', '#1e3a8a'],
  Fitness: ['#e11d48', '#881337'],
  Art: ['#7c3aed', '#4c1d95'],
  Science: ['#0d9488', '#134e4a'],
  News: ['#374151', '#111827'],
  DIY: ['#ca8a04', '#713f12'],
  Finance: ['#15803d', '#14532d'],
};

export default function VideoCard({ video, onPress, onMenuPress, compact, menuIcon = 'ellipsis-vertical' }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const grad = CATEGORY_GRADIENTS[video.category] ?? ['#1e293b', '#0f172a'];
  const thumbUrl = video.thumbnailUrl ? (video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `${API_BASE_URL}${video.thumbnailUrl}`) : null;
  const displayName = video.creator?.profile?.displayName || video.creator?.username || 'Unknown';
  // Clamp to [0,1] — progress can exceed duration slightly from rounding/replays.
  const watchRatio = video.duration > 0 && video.watchProgress
    ? Math.min(1, Math.max(0, video.watchProgress / video.duration))
    : 0;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    card: { marginBottom: 8 },
    thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    thumbIcon: { ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, justifyContent: 'center', alignItems: 'center' },
    durationBadge: { position: 'absolute', bottom: 6, right: 8, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    watchTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    watchFill: { height: '100%', backgroundColor: '#ff0033' },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    textBlock: { flex: 1 },
    title: { ...TYPOGRAPHY.body1, fontSize: 14, lineHeight: 19, marginBottom: 3 },
    meta: { color: COLORS.textMuted, fontSize: 12 },
    menuBtn: { padding: 2, marginTop: 2 },
    // compact
    compact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, paddingHorizontal: 16 },
    compactThumb: { width: 120, aspectRatio: 16 / 9, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundColor: '#0f172a' },
    compactInfo: { flex: 1 },
    compactTitle: { ...TYPOGRAPHY.body1, fontSize: 13, lineHeight: 18, marginBottom: 4 },
    compactMeta: { color: COLORS.textMuted, fontSize: 11 },
  }));

  if (compact) {
    return (
      <TouchableOpacity style={styles.compact} onPress={() => onPress(video)} activeOpacity={0.85}>
        <View style={styles.compactThumb}>
          {thumbUrl ? <Image source={{ uri: thumbUrl }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" /> : <LinearGradient colors={grad} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
          <View style={styles.durationBadge}><Text style={styles.durationText}>{fmtDuration(video.duration)}</Text></View>
          {watchRatio > 0 && (
            <View style={styles.watchTrack}>
              <View style={[styles.watchFill, { width: `${watchRatio * 100}%` }]} />
            </View>
          )}
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={2}>{video.title}</Text>
          <Text style={styles.compactMeta}>{displayName} · {fmtViews(video.views)} views</Text>
        </View>
        {onMenuPress && (
          <TouchableOpacity style={styles.menuBtn} onPress={() => onMenuPress(video)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={menuIcon as any} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(video)} activeOpacity={0.9}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
        ) : (
          <LinearGradient colors={grad} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <View style={styles.thumbIcon}>
              <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.5)" />
            </View>
          </LinearGradient>
        )}
        <View style={styles.durationBadge}><Text style={styles.durationText}>{fmtDuration(video.duration)}</Text></View>
        {watchRatio > 0 && (
          <View style={styles.watchTrack}>
            <View style={[styles.watchFill, { width: `${watchRatio * 100}%` }]} />
          </View>
        )}
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        {/* Avatar */}
        {video.creator?.profile?.avatarUrl ? (
          <Image source={{ uri: video.creator.profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
          <Text style={styles.meta}>{displayName} · {fmtViews(video.views)} views · {timeAgo(video.createdAt)}</Text>
        </View>
        {/* 3-dot menu */}
        {onMenuPress && (
          <TouchableOpacity style={styles.menuBtn} onPress={() => onMenuPress(video)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={menuIcon as any} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
