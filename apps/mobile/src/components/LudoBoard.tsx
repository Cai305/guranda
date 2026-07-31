import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect, Circle, Polygon, Text as SvgText } from 'react-native-svg';
import {
  SEAT_COLORS,
  globalSquareOf,
  finishSteps as finishStepsFor,
  trackLength as trackLengthFor,
} from '@mxit2/types';
import {
  computeLudoLayout, computeTokenPoints, entrySquareIndices, starSquareIndices, centerWedgePoints,
  TokenPoint,
} from '../config/ludoLayout';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  corners: number;
  tokens: number[][];
  currentSeat: number;
  mySeat: number | null;
  selectableTokenIndices: number[]; // token indices of `currentSeat` that can legally move right now
  hiddenSeats?: number[];           // seats with no player (e.g. unused corners in 1v1) — their tokens aren't drawn
  onSelectToken: (tokenIndex: number) => void;
}

const FRAME_DARK = '#4A2A16';
const FRAME_WOOD = '#6B4226';
const CELL_STROKE = 'rgba(40, 40, 40, 0.45)';
const STAR_CELL_BG = '#D8DADD';
const STAR_GLYPH = '#8E939B';
const GOLD = '#F2C21F';
const GOLD_DARK = '#C49A0C';

// Crown glyph drawn as a small polygon so it inherits exact colors
// on every platform (no emoji font differences).
function crownPoints(x: number, y: number, r: number): string {
  const s = r / 6;
  const pts: [number, number][] = [
    [-3.4, 2.6], [3.4, 2.6], [3.4, 1.4], [2.5, -0.9], [1.3, 0.7],
    [0, -2.3], [-1.3, 0.7], [-2.5, -0.9], [-3.4, 1.4],
  ];
  return pts.map(([px, py]) => `${x + px * s},${y + py * s}`).join(' ');
}

function TokenCoin({ tp, color, selectable, onPress }: {
  tp: TokenPoint; color: string; selectable: boolean; onPress?: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectable) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 420, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 420, useNativeDriver: false }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(0);
  }, [selectable]);

  const r = 8.5;
  const ringStroke = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3.5] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.0] });

  return (
    <>
      <Circle cx={tp.x} cy={tp.y + 1} r={r + 1.5} fill="rgba(0,0,0,0.3)" />
      <AnimatedCircle
        cx={tp.x} cy={tp.y} r={r + 1.5}
        fill={GOLD}
        stroke={selectable ? '#FFFFFF' : GOLD_DARK}
        strokeWidth={selectable ? ringStroke : 1}
        opacity={selectable ? ringOpacity : 1}
      />
      <Circle cx={tp.x} cy={tp.y} r={r - 1} fill="#FFFFFF" />
      <Circle cx={tp.x} cy={tp.y} r={r - 3.2} fill={color} onPress={onPress} />
      <Polygon points={crownPoints(tp.x, tp.y, r - 3.2)} fill="#FFFFFF" onPress={onPress} />
    </>
  );
}

export default function LudoBoard({
  corners, tokens, currentSeat, mySeat, selectableTokenIndices, hiddenSeats = [], onSelectToken,
}: Props) {
  const layout = useMemo(() => computeLudoLayout(corners), [corners]);
  const trackLength = trackLengthFor(corners);
  const finish = finishStepsFor(corners);
  const entrySquares = useMemo(() => entrySquareIndices(corners, trackLength), [corners, trackLength]);
  const starSquares = useMemo(() => new Set(starSquareIndices(corners, trackLength)), [corners, trackLength]);
  const colors = SEAT_COLORS.slice(0, corners);

  const tokenPoints = useMemo(
    () => computeTokenPoints(layout, tokens, corners, globalSquareOf, finish)
      .filter(tp => !hiddenSeats.includes(tp.seat)),
    [layout, tokens, corners, finish, hiddenSeats],
  );

  const canSelectMine = mySeat === currentSeat && selectableTokenIndices.length > 0;

  const renderTokens = () => tokenPoints.map(tp => {
    const selectable = canSelectMine && tp.seat === currentSeat && selectableTokenIndices.includes(tp.tokenIndex);
    return (
      <TokenCoin
        key={`token-${tp.seat}-${tp.tokenIndex}`}
        tp={tp}
        color={colors[tp.seat]}
        selectable={selectable}
        onPress={selectable ? () => onSelectToken(tp.tokenIndex) : undefined}
      />
    );
  });

  // ================= Classic 15×15 board (1v1 / 2v2) =================
  if (layout.grid) {
    const g = layout.grid;
    const cellRect = (c: number, r: number) => ({
      x: g.pad + c * g.cell,
      y: g.pad + r * g.cell,
      width: g.cell,
      height: g.cell,
    });

    return (
      <View style={styles.wrapper}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${layout.size} ${layout.size}`}>
          {/* Wooden frame */}
          <Rect x={0} y={0} width={layout.size} height={layout.size} rx={12} fill={FRAME_DARK} />
          <Rect x={g.pad * 0.35} y={g.pad * 0.35} width={layout.size - g.pad * 0.7} height={layout.size - g.pad * 0.7} rx={9} fill={FRAME_WOOD} />
          {/* Board face */}
          <Rect x={g.pad} y={g.pad} width={g.cell * 15} height={g.cell * 15} fill="#FFFFFF" />

          {/* Yards — full 6×6 colored quadrants with a darker rounded inner panel */}
          {g.yardOrigins.map(([c, r], seat) => {
            const x = g.pad + c * g.cell, y = g.pad + r * g.cell, w = g.cell * 6;
            const inset = g.cell * 0.75;
            return (
              <React.Fragment key={`yard-${seat}`}>
                <Rect x={x} y={y} width={w} height={w} fill={colors[seat]} />
                <Rect x={x + inset} y={y + inset} width={w - inset * 2} height={w - inset * 2} rx={g.cell * 0.6} fill={colors[seat]} />
                <Rect x={x + inset} y={y + inset} width={w - inset * 2} height={w - inset * 2} rx={g.cell * 0.6} fill="rgba(0,0,0,0.18)" />
              </React.Fragment>
            );
          })}

          {/* Home columns (colored) */}
          {g.stretchCells.map((cells, seat) =>
            cells.map(([c, r], i) => (
              <Rect key={`stretch-${seat}-${i}`} {...cellRect(c, r)} fill={colors[seat]} stroke={CELL_STROKE} strokeWidth={0.8} />
            )),
          )}

          {/* Path cells */}
          {g.ringCells.map(([c, r], i) => (
            <Rect
              key={`ring-${i}`}
              {...cellRect(c, r)}
              fill={starSquares.has(i) ? STAR_CELL_BG : '#FFFFFF'}
              stroke={CELL_STROKE}
              strokeWidth={0.8}
            />
          ))}

          {/* Grey stars on the mid-arm safe squares */}
          {Array.from(starSquares).map(i => {
            const p = layout.ringSquares[i];
            return (
              <SvgText key={`star-${i}`} x={p.x} y={p.y + g.cell * 0.24} fontSize={g.cell * 0.72} fill={STAR_GLYPH} textAnchor="middle">★</SvgText>
            );
          })}

          {/* Colored entry badges (globe squares) */}
          {entrySquares.map((i, seat) => {
            const p = layout.ringSquares[i];
            return (
              <React.Fragment key={`entry-${seat}`}>
                <Circle cx={p.x} cy={p.y} r={g.cell * 0.36} fill={colors[seat]} stroke="#FFF" strokeWidth={1.4} />
                <Circle cx={p.x} cy={p.y} r={g.cell * 0.2} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1} />
              </React.Fragment>
            );
          })}

          {/* Center: four home triangles */}
          {g.centerTriangles.map((points, seat) => (
            <Polygon key={`tri-${seat}`} points={points} fill={colors[seat]} stroke={CELL_STROKE} strokeWidth={0.8} />
          ))}

          {/* Token dock slots inside each yard panel */}
          {layout.homeBase.map((slots, seat) =>
            slots.map((slot, i) => (
              <Circle
                key={`dock-${seat}-${i}`}
                cx={slot.x}
                cy={slot.y}
                r={g.cell * 0.42}
                fill="rgba(255,255,255,0.25)"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={1.2}
              />
            )),
          )}

          {renderTokens()}
        </Svg>
      </View>
    );
  }

  // ================= Generalized star board (6/8 corners) =================
  const hubRadius = layout.size * 0.05;
  const CELL_SIZE = 13;
  const YARD_SIZE = 72;
  const YARD_INSET = 52;

  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${layout.size} ${layout.size}`}>
        <Rect
          x={layout.center.x - layout.boardHalf - 42}
          y={layout.center.y - layout.boardHalf - 42}
          width={(layout.boardHalf + 42) * 2}
          height={(layout.boardHalf + 42) * 2}
          rx={20}
          fill={FRAME_DARK}
        />
        <Rect
          x={layout.center.x - layout.boardHalf - 26}
          y={layout.center.y - layout.boardHalf - 26}
          width={(layout.boardHalf + 26) * 2}
          height={(layout.boardHalf + 26) * 2}
          rx={14}
          fill="#FFFFFF"
        />

        {Array.from({ length: corners }, (_, seat) => (
          <Polygon
            key={`wedge-${seat}`}
            points={centerWedgePoints(layout, seat, hubRadius)}
            fill={colors[seat]}
          />
        ))}
        <Circle cx={layout.center.x} cy={layout.center.y} r={hubRadius * 0.3} fill="#FFFFFF" />

        {layout.homeStretch.map((cells, seat) =>
          cells.map((p, i) => (
            <Rect
              key={`stretch-${seat}-${i}`}
              x={p.x - CELL_SIZE / 2}
              y={p.y - CELL_SIZE / 2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={colors[seat]}
              stroke={CELL_STROKE}
              strokeWidth={0.6}
            />
          )),
        )}

        {layout.ringSquares.map((p, i) => (
          <Rect
            key={`ring-${i}`}
            x={p.x - CELL_SIZE / 2}
            y={p.y - CELL_SIZE / 2}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={starSquares.has(i) ? STAR_CELL_BG : '#FFFFFF'}
            stroke={CELL_STROKE}
            strokeWidth={0.7}
          />
        ))}
        {Array.from(starSquares).map(i => {
          const p = layout.ringSquares[i];
          return <SvgText key={`star-${i}`} x={p.x} y={p.y + 3} fontSize={9} fill={STAR_GLYPH} textAnchor="middle">★</SvgText>;
        })}
        {entrySquares.map((i, seat) => {
          const p = layout.ringSquares[i];
          return (
            <Circle key={`entry-${seat}`} cx={p.x} cy={p.y} r={4.2} fill={colors[seat]} stroke="#FFF" strokeWidth={1.2} />
          );
        })}

        {layout.yardCenter.map((yc, seat) => (
          <React.Fragment key={`yard-${seat}`}>
            <Rect
              x={yc.x - YARD_SIZE / 2}
              y={yc.y - YARD_SIZE / 2}
              width={YARD_SIZE}
              height={YARD_SIZE}
              rx={12}
              fill={colors[seat]}
            />
            <Rect
              x={yc.x - YARD_INSET / 2}
              y={yc.y - YARD_INSET / 2}
              width={YARD_INSET}
              height={YARD_INSET}
              rx={10}
              fill={colors[seat]}
            />
            <Rect
              x={yc.x - YARD_INSET / 2}
              y={yc.y - YARD_INSET / 2}
              width={YARD_INSET}
              height={YARD_INSET}
              rx={10}
              fill="rgba(0,0,0,0.18)"
            />
            {layout.homeBase[seat].map((slot, i) => (
              <Circle
                key={`dock-${seat}-${i}`}
                cx={slot.x}
                cy={slot.y}
                r={10}
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1.6}
              />
            ))}
          </React.Fragment>
        ))}

        {renderTokens()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 1,
  },
});
