import { STEPS_PER_ARM, HOME_STRETCH_LEN } from '@mxit2/types';

// ============================================================
// Ludo board geometry.
//
// corners === 4 (1v1, 2v2): the EXACT classic 15×15 grid board —
// four 6×6 colored quadrant yards, 3-wide cross arms, a 52-cell
// path, 5-cell colored home columns, and a 4-triangle center.
// Cell coordinates are hard-coded below and verified against the
// rules engine's indexing (seat s enters at global s*13; star
// safe-squares at s*13+8).
//
// corners === 6 / 8 (2v2v2, 1v5, 4v4): those player counts can't
// exist on a 4-arm board, so they use a generalized star layout
// where points are projected onto a square boundary.
// ============================================================

export interface Point { x: number; y: number }

export interface GridData {
  cell: number;
  pad: number;
  ringCells: [number, number][];        // [col,row] per global ring index
  stretchCells: [number, number][][];   // [seat][k]
  yardOrigins: [number, number][];      // [seat] top-left cell of 6×6 yard
  centerTriangles: string[];            // [seat] polygon points
}

export interface LudoLayout {
  size: number;
  center: Point;
  boardHalf: number;
  trackLength: number;
  ringSquares: Point[];          // index = global ring square
  homeStretch: Point[][];        // [seat][0..HOME_STRETCH_LEN-1]
  homeBase: Point[][];           // [seat][0..3]
  yardCenter: Point[];           // [seat] — center of that seat's yard block
  armAngleDeg: number[];         // per-seat arm angle (star layout only)
  sectorDeg: number;
  grid?: GridData;               // present only for the classic 4-corner board
}

// ---- Classic 4-corner board data (15×15 grid, 0-based cells) ----
//
// Global ring index 0 = seat 0 (red, top-right yard) entry square.
// Sequence runs clockwise, 13 cells per arm, 52 total.
const RING_PATH_4: [number, number][] = [
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7],
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0],
  [8, 0],
];

// Home columns, outer → center. Seat order: red(top), green(right),
// yellow(bottom), blue(left) — each column lives in the arm its
// yard touches, exactly as on the reference board.
const STRETCH_4: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
];

// 6×6 yard origins: red top-right, green bottom-right,
// yellow bottom-left, blue top-left.
const YARD_ORIGINS_4: [number, number][] = [
  [9, 0], [9, 9], [0, 9], [0, 0],
];

function computeClassicLayout(size: number): LudoLayout {
  const pad = size * 0.045;
  const cell = (size - 2 * pad) / 15;
  const at = (col: number, row: number): Point => ({
    x: pad + (col + 0.5) * cell,
    y: pad + (row + 0.5) * cell,
  });

  const ringSquares = RING_PATH_4.map(([c, r]) => at(c, r));

  const homeStretch = STRETCH_4.map(cells => {
    const pts = cells.map(([c, r]) => at(c, r));
    while (pts.length < HOME_STRETCH_LEN) pts.push(at(7, 7)); // board center (unused safety slot)
    return pts;
  });

  const yardCenter = YARD_ORIGINS_4.map(([c, r]) => at(c + 2.5, r + 2.5));
  const homeBase = yardCenter.map(yc => {
    const off = cell * 1.05;
    return [
      { x: yc.x - off, y: yc.y - off },
      { x: yc.x + off, y: yc.y - off },
      { x: yc.x - off, y: yc.y + off },
      { x: yc.x + off, y: yc.y + off },
    ];
  });

  // Center 3×3 square split into 4 triangles, one per seat's arm:
  // red top, green right, yellow bottom, blue left.
  const x0 = pad + 6 * cell, x1 = pad + 9 * cell;
  const y0 = pad + 6 * cell, y1 = pad + 9 * cell;
  const cc = pad + 7.5 * cell;
  const centerTriangles = [
    `${x0},${y0} ${x1},${y0} ${cc},${cc}`, // top    (red)
    `${x1},${y0} ${x1},${y1} ${cc},${cc}`, // right  (green)
    `${x1},${y1} ${x0},${y1} ${cc},${cc}`, // bottom (yellow)
    `${x0},${y1} ${x0},${y0} ${cc},${cc}`, // left   (blue)
  ];

  return {
    size,
    center: { x: size / 2, y: size / 2 },
    boardHalf: size / 2 - pad,
    trackLength: 52,
    ringSquares,
    homeStretch,
    homeBase,
    yardCenter,
    armAngleDeg: [-90, 0, 90, 180],
    sectorDeg: 90,
    grid: {
      cell,
      pad,
      ringCells: RING_PATH_4,
      stretchCells: STRETCH_4,
      yardOrigins: YARD_ORIGINS_4,
      centerTriangles,
    },
  };
}

// ---- Generalized star board for 6/8-corner modes ----

// Projects a direction (angleDeg) onto the boundary of a square
// with half-side `half`, centered at `center`.
function squarePoint(center: Point, angleDeg: number, half: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const scale = half / Math.max(Math.abs(dx), Math.abs(dy));
  return { x: center.x + scale * dx, y: center.y + scale * dy };
}

function computeStarLayout(corners: number, size: number): LudoLayout {
  const center: Point = { x: size / 2, y: size / 2 };
  const boardHalf = size * 0.33;
  const trackLength = corners * STEPS_PER_ARM;
  const anglePerSquare = 360 / trackLength;
  const sectorDeg = 360 / corners;
  const sectorOffset = sectorDeg / 2;

  const ringSquares: Point[] = [];
  for (let i = 0; i < trackLength; i++) {
    const angleDeg = -90 + i * anglePerSquare;
    ringSquares.push(squarePoint(center, angleDeg, boardHalf));
  }

  const homeStretch: Point[][] = [];
  const homeBase: Point[][] = [];
  const yardCenter: Point[] = [];
  const armAngleDeg: number[] = [];

  for (let s = 0; s < corners; s++) {
    const armAngle = -90 + s * sectorDeg;
    armAngleDeg.push(armAngle);

    const stretch: Point[] = [];
    for (let k = 0; k < HOME_STRETCH_LEN; k++) {
      const half = boardHalf * (1 - (k + 1) / (HOME_STRETCH_LEN + 1));
      stretch.push(squarePoint(center, armAngle, half));
    }
    homeStretch.push(stretch);

    const yardAngle = armAngle + sectorOffset;
    const yc = squarePoint(center, yardAngle, boardHalf * 1.5);
    yardCenter.push(yc);
    const off = size * 0.032;
    homeBase.push([
      { x: yc.x - off, y: yc.y - off },
      { x: yc.x + off, y: yc.y - off },
      { x: yc.x - off, y: yc.y + off },
      { x: yc.x + off, y: yc.y + off },
    ]);
  }

  return { size, center, boardHalf, trackLength, ringSquares, homeStretch, homeBase, yardCenter, armAngleDeg, sectorDeg };
}

export function computeLudoLayout(corners: number, size = 360): LudoLayout {
  if (corners === 4) return computeClassicLayout(size);
  return computeStarLayout(corners, size);
}

export interface TokenPoint extends Point {
  seat: number;
  tokenIndex: number;
}

// Small jitter so 2+ tokens sharing one visual anchor don't fully overlap.
function spreadAround(anchor: Point, items: TokenPoint[], spread: number): TokenPoint[] {
  if (items.length <= 1) return items.map(i => ({ ...i, x: anchor.x, y: anchor.y }));
  const offsets = [
    { dx: -spread, dy: -spread }, { dx: spread, dy: -spread },
    { dx: -spread, dy: spread }, { dx: spread, dy: spread },
    { dx: 0, dy: -spread * 1.4 }, { dx: 0, dy: spread * 1.4 },
    { dx: -spread * 1.4, dy: 0 }, { dx: spread * 1.4, dy: 0 },
  ];
  return items.map((item, i) => ({
    ...item,
    x: anchor.x + (offsets[i]?.dx ?? 0),
    y: anchor.y + (offsets[i]?.dy ?? 0),
  }));
}

// Computes on-screen positions for every token, grouping tokens
// that land on the same anchor (ring square, home-stretch cell, or
// center) and spreading them apart slightly.
export function computeTokenPoints(
  layout: LudoLayout,
  tokens: number[][],
  corners: number,
  globalSquareOf: (seat: number, localSteps: number, corners: number) => number | null,
  finishSteps: number,
): TokenPoint[] {
  const groups = new Map<string, TokenPoint[]>();
  const results: TokenPoint[] = [];

  tokens.forEach((seatTokens, seat) => {
    seatTokens.forEach((localSteps, tokenIndex) => {
      if (localSteps === -1) {
        const p = layout.homeBase[seat]?.[tokenIndex];
        if (p) results.push({ seat, tokenIndex, x: p.x, y: p.y });
        return;
      }
      if (localSteps === finishSteps) {
        const key = 'finish';
        const list = groups.get(key) || [];
        list.push({ seat, tokenIndex, x: layout.center.x, y: layout.center.y });
        groups.set(key, list);
        return;
      }
      const global = globalSquareOf(seat, localSteps, corners);
      if (global !== null) {
        const key = `ring-${global}`;
        const list = groups.get(key) || [];
        list.push({ seat, tokenIndex, x: layout.ringSquares[global].x, y: layout.ringSquares[global].y });
        groups.set(key, list);
        return;
      }
      // In home stretch
      const stretchIdx = localSteps - layout.trackLength;
      const key = `stretch-${seat}-${stretchIdx}`;
      const p = layout.homeStretch[seat]?.[stretchIdx];
      if (!p) return;
      const list = groups.get(key) || [];
      list.push({ seat, tokenIndex, x: p.x, y: p.y });
      groups.set(key, list);
    });
  });

  groups.forEach(list => {
    const anchor = { x: list[0].x, y: list[0].y };
    const spread = layout.size * 0.014;
    results.push(...spreadAround(anchor, list, spread));
  });

  return results;
}

export function entrySquareIndices(corners: number, trackLength: number): number[] {
  return Array.from({ length: corners }, (_, s) => (s * STEPS_PER_ARM) % trackLength);
}

export function starSquareIndices(corners: number, trackLength: number): number[] {
  return Array.from({ length: corners }, (_, s) => ((s * STEPS_PER_ARM) + 8) % trackLength);
}

export function safeSquareIndices(corners: number, trackLength: number): number[] {
  return [...entrySquareIndices(corners, trackLength), ...starSquareIndices(corners, trackLength)];
}

// Pinwheel wedge for the star layout's center hub.
export function centerWedgePoints(layout: LudoLayout, seat: number, hubRadius: number): string {
  const angle = layout.armAngleDeg[seat];
  const half = layout.sectorDeg / 2;
  const p1 = squarePoint(layout.center, angle - half, hubRadius);
  const p2 = squarePoint(layout.center, angle + half, hubRadius);
  return `${layout.center.x},${layout.center.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
}
