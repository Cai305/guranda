// Murabaraba board renderer: three concentric squares with mid-point spokes
// and corner diagonals, 24 tappable intersections.

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Circle } from 'react-native-svg';
import { Cell } from './engine';

export const P1_COLOR = '#8B5CF6'; // purple cows
export const P2_COLOR = '#F59E0B'; // amber cows

const SIZE = 320;
const CENTER = SIZE / 2;
const RING_HALF = [140, 95, 50]; // outer, middle, inner half-widths

/** Pixel coordinates for each of the 24 points (id = ring*8 + pos). */
export const POINT_XY: { x: number; y: number }[] = (() => {
  const pts: { x: number; y: number }[] = [];
  for (let r = 0; r < 3; r++) {
    const h = RING_HALF[r];
    const offsets = [
      [-h, -h], [0, -h], [h, -h], [h, 0],
      [h, h], [0, h], [-h, h], [-h, 0],
    ];
    for (const [dx, dy] of offsets) pts.push({ x: CENTER + dx, y: CENTER + dy });
  }
  return pts;
})();

interface Props {
  board: Cell[];
  selected: number | null;
  legalTargets: number[];
  shootTargets: number[];
  lastMoveTo: number | null;
  onPointPress: (point: number) => void;
  size?: number;
}

export default function MurabarabaBoard({
  board, selected, legalTargets, shootTargets, lastMoveTo, onPointPress, size = SIZE,
}: Props) {
  const scale = size / SIZE;
  const lineColor = 'rgba(255,255,255,0.28)';
  const o = RING_HALF[0], i = RING_HALF[2];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Ring squares */}
        {RING_HALF.map((h, idx) => (
          <Rect
            key={idx}
            x={CENTER - h} y={CENTER - h} width={h * 2} height={h * 2}
            stroke={lineColor} strokeWidth={2} fill="none"
          />
        ))}
        {/* Mid-point spokes */}
        <Line x1={CENTER} y1={CENTER - o} x2={CENTER} y2={CENTER - i} stroke={lineColor} strokeWidth={2} />
        <Line x1={CENTER + o} y1={CENTER} x2={CENTER + i} y2={CENTER} stroke={lineColor} strokeWidth={2} />
        <Line x1={CENTER} y1={CENTER + o} x2={CENTER} y2={CENTER + i} stroke={lineColor} strokeWidth={2} />
        <Line x1={CENTER - o} y1={CENTER} x2={CENTER - i} y2={CENTER} stroke={lineColor} strokeWidth={2} />
        {/* Corner diagonals (the Murabaraba signature) */}
        <Line x1={CENTER - o} y1={CENTER - o} x2={CENTER - i} y2={CENTER - i} stroke={lineColor} strokeWidth={2} />
        <Line x1={CENTER + o} y1={CENTER - o} x2={CENTER + i} y2={CENTER - i} stroke={lineColor} strokeWidth={2} />
        <Line x1={CENTER + o} y1={CENTER + o} x2={CENTER + i} y2={CENTER + i} stroke={lineColor} strokeWidth={2} />
        <Line x1={CENTER - o} y1={CENTER + o} x2={CENTER - i} y2={CENTER + i} stroke={lineColor} strokeWidth={2} />

        {POINT_XY.map((pt, id) => {
          const cow = board[id];
          const isSelected = selected === id;
          const isLegal = legalTargets.includes(id);
          const isShootable = shootTargets.includes(id);
          const isLast = lastMoveTo === id;
          return (
            <React.Fragment key={id}>
              {/* Empty intersection dot */}
              {cow === null && !isLegal && (
                <Circle cx={pt.x} cy={pt.y} r={4} fill="rgba(255,255,255,0.35)" />
              )}
              {/* Legal destination marker */}
              {isLegal && (
                <Circle
                  cx={pt.x} cy={pt.y} r={9}
                  fill="rgba(52,211,153,0.35)" stroke="#34D399" strokeWidth={2}
                />
              )}
              {/* Cow */}
              {cow !== null && (
                <>
                  <Circle
                    cx={pt.x} cy={pt.y} r={13}
                    fill={cow === 0 ? P1_COLOR : P2_COLOR}
                    stroke={
                      isShootable ? '#EF4444'
                        : isSelected ? '#FFFFFF'
                        : isLast ? 'rgba(255,255,255,0.8)'
                        : 'rgba(0,0,0,0.45)'
                    }
                    strokeWidth={isShootable || isSelected ? 3 : 2}
                  />
                  <Circle cx={pt.x - 4} cy={pt.y - 4} r={4} fill="rgba(255,255,255,0.35)" />
                </>
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Tap targets (RN views, easier hit-slop than SVG events) */}
      {POINT_XY.map((pt, id) => (
        <TouchableOpacity
          key={id}
          onPress={() => onPointPress(id)}
          style={[
            styles.touch,
            { left: pt.x * scale - 20, top: pt.y * scale - 20 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  touch: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
});
