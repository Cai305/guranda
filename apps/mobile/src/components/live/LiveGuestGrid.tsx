import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LiveVideoView from '../LiveVideoView';

export interface VideoTile {
  identity: string;
  name: string;
  track: any;
  isLocal?: boolean;
  muted?: boolean;
  mirror?: boolean;
}

// Lays out 1-4+ simultaneous camera feeds (the host plus however many
// guests are on stage) as an even grid instead of a single full-bleed
// video — this is what actually makes multi-guest streaming visible to
// viewers, not just plumbed through on the backend.
export default function LiveGuestGrid({ tiles }: { tiles: VideoTile[] }) {
  if (tiles.length === 0) return null;
  if (tiles.length === 1) {
    const t = tiles[0];
    return (
      <View style={StyleSheet.absoluteFill}>
        <LiveVideoView track={t.track} muted={t.muted} mirror={t.mirror} />
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.grid]}>
      {tiles.map(t => (
        <View key={t.identity} style={[styles.tile, tiles.length > 2 && styles.tileQuarter]}>
          <LiveVideoView track={t.track} muted={t.muted} mirror={t.mirror} />
          <View style={styles.nameTag}>
            <Text style={styles.nameTagText} numberOfLines={1}>{t.name}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '50%',
    height: '100%',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  tileQuarter: {
    height: '50%',
  },
  nameTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '80%',
  },
  nameTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
