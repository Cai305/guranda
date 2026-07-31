// Pool table renderer: felt, cushions, pockets, all 16 balls (solids,
// stripes, 8, cue), and the aiming line while the player lines up a shot.

import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ball, TABLE_W, TABLE_H, CUSHION, BALL_R, POCKET_R, POCKETS } from './physics';

const BALL_COLORS: Record<number, string> = {
  1: '#FDD835', 2: '#1E88E5', 3: '#E53935', 4: '#8E24AA',
  5: '#FB8C00', 6: '#43A047', 7: '#6D4C41',
  8: '#111111',
  9: '#FDD835', 10: '#1E88E5', 11: '#E53935', 12: '#8E24AA',
  13: '#FB8C00', 14: '#43A047', 15: '#6D4C41',
};

interface Props {
  balls: Ball[];
  width: number;                 // rendered pixel width
  aim: { angle: number } | null; // aiming line from cue ball
}

export default function PoolTable({ balls, width, aim }: Props) {
  const height = width * (TABLE_H / TABLE_W);
  const cue = balls.find(b => b.id === 0);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${TABLE_W} ${TABLE_H}`}>
        {/* Frame + felt */}
        <Rect x={0} y={0} width={TABLE_W} height={TABLE_H} rx={26} fill="#4E2A14" />
        <Rect
          x={CUSHION - 12} y={CUSHION - 12}
          width={TABLE_W - (CUSHION - 12) * 2} height={TABLE_H - (CUSHION - 12) * 2}
          rx={14} fill="#0B6E3C"
        />
        <Rect
          x={CUSHION} y={CUSHION}
          width={TABLE_W - CUSHION * 2} height={TABLE_H - CUSHION * 2}
          fill="#0E8347"
        />

        {/* Pockets */}
        {POCKETS.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={POCKET_R} fill="#000" />
        ))}

        {/* Head string marker */}
        <Line
          x1={TABLE_W * 0.25} y1={CUSHION} x2={TABLE_W * 0.25} y2={TABLE_H - CUSHION}
          stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="8 10"
        />

        {/* Aim line */}
        {aim && cue && !cue.potted && (
          <Line
            x1={cue.x} y1={cue.y}
            x2={cue.x + Math.cos(aim.angle) * 1200}
            y2={cue.y + Math.sin(aim.angle) * 1200}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={3}
            strokeDasharray="10 12"
          />
        )}

        {/* Balls */}
        {balls.filter(b => !b.potted).map(b => {
          const stripe = b.id >= 9 && b.id <= 15;
          return (
            <React.Fragment key={b.id}>
              {b.id === 0 ? (
                <Circle cx={b.x} cy={b.y} r={BALL_R} fill="#F5F1E6" stroke="#C9C2AE" strokeWidth={1.5} />
              ) : stripe ? (
                <>
                  <Circle cx={b.x} cy={b.y} r={BALL_R} fill="#F5F1E6" />
                  <Line
                    x1={b.x - BALL_R + 2} y1={b.y} x2={b.x + BALL_R - 2} y2={b.y}
                    stroke={BALL_COLORS[b.id]} strokeWidth={BALL_R * 1.15} strokeLinecap="round"
                  />
                  <Circle cx={b.x} cy={b.y} r={BALL_R} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
                </>
              ) : (
                <Circle
                  cx={b.x} cy={b.y} r={BALL_R}
                  fill={BALL_COLORS[b.id]} stroke="rgba(0,0,0,0.35)" strokeWidth={1}
                />
              )}
              {b.id !== 0 && (
                <>
                  <Circle cx={b.x} cy={b.y} r={BALL_R * 0.46} fill="#F5F1E6" />
                  <SvgText
                    x={b.x} y={b.y + 3.6}
                    fontSize={10} fontWeight="bold" fill="#111"
                    textAnchor="middle"
                  >
                    {b.id}
                  </SvgText>
                </>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
