import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrackItem, LANE_COUNT } from '@mxit2/types';
import { COLORS, RADIUS } from '../../theme';
import F1Car from './F1Car';

const VIEW_WINDOW = 260; // meters of track visible ahead at once

interface Ghost {
  distance: number;
  lane: number;
  displayName: string;
  crashed: boolean;
  color: string;
}

interface Props {
  myDistance: number;
  myLane: number; // continuous 0..LANE_COUNT-1
  myColor: string;
  crashed: boolean;
  boosted: boolean;
  track: TrackItem[];
  ghosts: Ghost[];
  height: number;
  width: number;
}

function yFor(itemDistance: number, myDistance: number, height: number) {
  const rel = itemDistance - myDistance;
  return height * (1 - rel / VIEW_WINDOW);
}

const ITEM_ICON: Record<TrackItem['type'], { name: string; color: string }> = {
  obstacle: { name: 'car-sport', color: '#9CA3AF' }, // plain oncoming traffic — not a racer
  coin: { name: 'ellipse', color: '#FBBF24' },
  boost: { name: 'flash', color: '#38BDF8' },
};

export default function TurboRacingTrack({ myDistance, myLane, myColor, crashed, boosted, track, ghosts, height, width }: Props) {
  const laneWidth = width / LANE_COUNT;

  const visibleItems = track.filter(
    item => item.distance >= myDistance - 20 && item.distance <= myDistance + VIEW_WINDOW,
  );

  return (
    <View style={[styles.road, { width, height, backgroundColor: '#151022' }]}>
      {Array.from({ length: LANE_COUNT - 1 }, (_, i) => (
        <View key={i} style={[styles.laneDivider, { left: laneWidth * (i + 1) }]} />
      ))}

      {visibleItems.map((item, i) => {
        const icon = ITEM_ICON[item.type];
        const y = yFor(item.distance, myDistance, height);
        return (
          <View
            key={i}
            style={[
              styles.item,
              { left: laneWidth * item.lane + laneWidth / 2 - 14, top: y - 14 },
            ]}
          >
            <Ionicons name={icon.name as any} size={22} color={icon.color} />
          </View>
        );
      })}

      {ghosts.map((g, i) => {
        const y = yFor(g.distance, myDistance, height);
        if (y < -30 || y > height + 30) return null;
        return (
          <View key={i} style={[styles.carWrap, { left: laneWidth * g.lane + laneWidth / 2 - 16, top: y - 26 }]}>
            <F1Car color={g.color} crashed={g.crashed} size={32} />
            <Text style={styles.ghostLabel} numberOfLines={1}>{g.displayName}</Text>
          </View>
        );
      })}

      <View
        style={[
          styles.carWrap,
          { left: laneWidth * myLane + laneWidth / 2 - 18, top: height - 80 },
        ]}
      >
        <F1Car color={myColor} crashed={crashed} size={38} />
        {boosted && <View style={styles.boostGlow} pointerEvents="none" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  road: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  laneDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  item: {
    position: 'absolute',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carWrap: {
    position: 'absolute',
    width: 40,
    alignItems: 'center',
  },
  boostGlow: {
    position: 'absolute',
    top: -6, left: -6, right: -6, bottom: -6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  ghostLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    marginTop: 2,
  },
});
