import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme';
import { LiveStream, categoryOf } from '../data/mockLiveStreams';
import { formatCount } from '../utils/format';

interface Props {
  stream: LiveStream;
  onPress: (stream: LiveStream) => void;
  size?: 'grid' | 'compact';
}

export default function LiveStreamCard({ stream, onPress, size = 'grid' }: Props) {
  const category = categoryOf(stream);
  const gradient = category?.gradient || COLORS.border;

  return (
    <TouchableOpacity
      style={size === 'compact' ? styles.compactWrapper : styles.gridWrapper}
      activeOpacity={0.85}
      onPress={() => onPress(stream)}
    >
      <LinearGradient
        colors={gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.thumb, size === 'compact' && styles.thumbCompact]}
      >
        <View style={styles.topRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
          <View style={styles.viewersPill}>
            <Ionicons name="eye" size={11} color="#FFF" />
            <Text style={styles.viewersText}>{formatCount(stream.viewers)}</Text>
          </View>
        </View>
        <Ionicons name={category?.icon as any || 'radio'} size={30} color="rgba(255,255,255,0.35)" style={styles.bgIcon} />
      </LinearGradient>

      <View style={styles.info}>
        <Image
          source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${stream.creator.avatarSeed}` }}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{stream.title}</Text>
          <View style={styles.creatorRow}>
            <Text style={styles.creatorName} numberOfLines={1}>{stream.creator.name}</Text>
            {stream.creator.verified && <Ionicons name="checkmark-circle" size={12} color={COLORS.secondary} />}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridWrapper: {
    width: '48%',
  },
  compactWrapper: {
    width: 150,
  },
  thumb: {
    height: 110,
    borderRadius: RADIUS.md,
    padding: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  thumbCompact: {
    height: 90,
  },
  bgIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  livePillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  viewersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  viewersText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  creatorName: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
