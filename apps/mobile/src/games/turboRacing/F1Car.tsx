// Top-down F1-style open-wheel car — nose at the top (pointing "forward",
// i.e. further up the track), rear at the bottom. `color` is the livery
// paint; wheels/halo/wing endplates stay fixed dark tones for realism.
import React from 'react';
import Svg, { Path, Rect, Ellipse, Circle } from 'react-native-svg';

interface Props {
  color: string;
  size?: number;
  crashed?: boolean;
}

const WHEEL_COLOR = '#111827';
const DARK_ACCENT = '#0B0B0F';

export default function F1Car({ color, size = 36, crashed = false }: Props) {
  const bodyColor = crashed ? '#4B4B52' : color;
  const width = size;
  const height = size * 1.55;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 160">
      {/* Rear wheels */}
      <Ellipse cx={8} cy={124} rx={9} ry={16} fill={WHEEL_COLOR} />
      <Ellipse cx={92} cy={124} rx={9} ry={16} fill={WHEEL_COLOR} />
      {/* Front wheels */}
      <Ellipse cx={10} cy={36} rx={8} ry={14} fill={WHEEL_COLOR} />
      <Ellipse cx={90} cy={36} rx={8} ry={14} fill={WHEEL_COLOR} />

      {/* Rear wing */}
      <Rect x={14} y={142} width={72} height={9} rx={2} fill={bodyColor} />
      <Rect x={14} y={136} width={6} height={20} fill={DARK_ACCENT} />
      <Rect x={80} y={136} width={6} height={20} fill={DARK_ACCENT} />

      {/* Sidepods */}
      <Path
        d="M28 80 Q22 100 28 122 L38 122 Q34 100 38 80 Z"
        fill={bodyColor}
      />
      <Path
        d="M72 80 Q78 100 72 122 L62 122 Q66 100 62 80 Z"
        fill={bodyColor}
      />

      {/* Main chassis (tapers to the nose) */}
      <Path
        d="M40 20 Q50 12 60 20 L64 100 Q60 130 50 136 Q40 130 36 100 Z"
        fill={bodyColor}
      />

      {/* Halo / cockpit */}
      <Ellipse cx={50} cy={62} rx={9} ry={14} fill={DARK_ACCENT} />
      <Circle cx={50} cy={58} r={4} fill="#1F2937" />

      {/* Nose tip */}
      <Path d="M46 14 L54 14 L50 2 Z" fill={bodyColor} />

      {/* Front wing */}
      <Rect x={10} y={26} width={80} height={7} rx={2} fill={bodyColor} />
      <Rect x={10} y={22} width={6} height={16} fill="#F3F4F6" />
      <Rect x={84} y={22} width={6} height={16} fill="#F3F4F6" />
    </Svg>
  );
}
