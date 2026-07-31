// 2D billiards physics. Fixed-timestep simulation with elastic ball-ball
// collisions, cushion rebounds, rolling friction and six pockets.
// Coordinates: table space 1000 x 500, origin top-left.

export const TABLE_W = 1000;
export const TABLE_H = 500;
export const CUSHION = 40;          // playable field inset
export const BALL_R = 14;
export const POCKET_R = 30;

export interface Ball {
  id: number;        // 0 = cue, 1-7 solids, 8 = eight, 9-15 stripes
  x: number;
  y: number;
  vx: number;
  vy: number;
  potted: boolean;
}

export interface ShotEvents {
  firstHit: number | null;   // first object ball the cue touched
  potted: number[];          // ball ids potted this shot, in order
  cueScratched: boolean;
}

export const POCKETS: { x: number; y: number }[] = [
  { x: CUSHION, y: CUSHION },
  { x: TABLE_W / 2, y: CUSHION - 10 },
  { x: TABLE_W - CUSHION, y: CUSHION },
  { x: CUSHION, y: TABLE_H - CUSHION },
  { x: TABLE_W / 2, y: TABLE_H - CUSHION + 10 },
  { x: TABLE_W - CUSHION, y: TABLE_H - CUSHION },
];

const FRICTION = 0.9915;    // per step velocity retention
const RESTITUTION = 0.86;   // cushion bounce
const STOP_EPS = 2.2;       // velocity considered stopped
const STEP = 1 / 120;

export function rackBalls(): Ball[] {
  const balls: Ball[] = [];
  // Cue ball on the head spot (left quarter)
  balls.push({ id: 0, x: TABLE_W * 0.25, y: TABLE_H / 2, vx: 0, vy: 0, potted: false });

  // Standard-ish rack at the foot spot: 8-ball centered, corners mixed
  const rackOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const footX = TABLE_W * 0.72;
  const footY = TABLE_H / 2;
  const gap = BALL_R * 2 + 0.6;
  let idx = 0;
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row <= col; row++) {
      const id = rackOrder[idx++];
      balls.push({
        id,
        x: footX + col * (gap * 0.87),
        y: footY + (row - col / 2) * gap,
        vx: 0,
        vy: 0,
        potted: false,
      });
    }
  }
  return balls;
}

export function ballsMoving(balls: Ball[]): boolean {
  return balls.some(b => !b.potted && (Math.abs(b.vx) > STOP_EPS || Math.abs(b.vy) > STOP_EPS));
}

/** Strike the cue ball. angle in radians, power 0..1. */
export function strikeCue(balls: Ball[], angle: number, power: number) {
  const cue = balls.find(b => b.id === 0);
  if (!cue || cue.potted) return;
  const speed = 300 + power * 1350;
  cue.vx = Math.cos(angle) * speed;
  cue.vy = Math.sin(angle) * speed;
}

/** Advance the simulation by `steps` fixed sub-steps, mutating balls and events. */
export function advance(balls: Ball[], events: ShotEvents, steps: number) {
  for (let s = 0; s < steps; s++) {
    let anyMoving = false;

    for (const b of balls) {
      if (b.potted) continue;
      b.x += b.vx * STEP;
      b.y += b.vy * STEP;
      b.vx *= FRICTION;
      b.vy *= FRICTION;
      if (Math.abs(b.vx) <= STOP_EPS && Math.abs(b.vy) <= STOP_EPS) {
        b.vx = 0;
        b.vy = 0;
      } else {
        anyMoving = true;
      }

      // Pockets first (so cushions near pockets don't reject the ball)
      for (const p of POCKETS) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (dx * dx + dy * dy < POCKET_R * POCKET_R) {
          b.potted = true;
          b.vx = 0;
          b.vy = 0;
          if (b.id === 0) events.cueScratched = true;
          else events.potted.push(b.id);
          break;
        }
      }
      if (b.potted) continue;

      // Cushions
      const minX = CUSHION + BALL_R;
      const maxX = TABLE_W - CUSHION - BALL_R;
      const minY = CUSHION + BALL_R;
      const maxY = TABLE_H - CUSHION - BALL_R;
      if (b.x < minX) { b.x = minX; b.vx = Math.abs(b.vx) * RESTITUTION; }
      if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * RESTITUTION; }
      if (b.y < minY) { b.y = minY; b.vy = Math.abs(b.vy) * RESTITUTION; }
      if (b.y > maxY) { b.y = maxY; b.vy = -Math.abs(b.vy) * RESTITUTION; }
    }

    // Ball-ball collisions (equal mass elastic)
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.potted) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (b.potted) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = BALL_R * 2;
        if (distSq >= minDist * minDist || distSq === 0) continue;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        // Record cue's first object-ball contact
        if (events.firstHit === null) {
          if (a.id === 0) events.firstHit = b.id;
          else if (b.id === 0) events.firstHit = a.id;
        }

        // Separate overlap
        const overlap = (minDist - dist) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Exchange normal velocity components
        const avn = a.vx * nx + a.vy * ny;
        const bvn = b.vx * nx + b.vy * ny;
        const diff = avn - bvn;
        if (diff > 0) {
          a.vx -= diff * nx;
          a.vy -= diff * ny;
          b.vx += diff * nx;
          b.vy += diff * ny;
        }
      }
    }

    if (!anyMoving) break;
  }
}

/** Respot the cue ball after a scratch (ball in hand simplified to head spot). */
export function respotCue(balls: Ball[]) {
  const cue = balls.find(b => b.id === 0)!;
  let x = TABLE_W * 0.25;
  let y = TABLE_H / 2;
  // Nudge until not overlapping another ball
  let tries = 0;
  while (
    balls.some(b => !b.potted && b.id !== 0 && (b.x - x) ** 2 + (b.y - y) ** 2 < (BALL_R * 2.2) ** 2) &&
    tries < 40
  ) {
    x -= 12;
    if (x < CUSHION + BALL_R) { x = TABLE_W * 0.3; y += 18; }
    tries++;
  }
  cue.potted = false;
  cue.x = x;
  cue.y = y;
  cue.vx = 0;
  cue.vy = 0;
}

/** Is the straight path between two points clear of other balls? */
export function pathClear(
  balls: Ball[],
  fromX: number, fromY: number,
  toX: number, toY: number,
  ignore: number[],
): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len === 0) return true;
  const ux = dx / len;
  const uy = dy / len;
  for (const b of balls) {
    if (b.potted || ignore.includes(b.id)) continue;
    const px = b.x - fromX;
    const py = b.y - fromY;
    const t = px * ux + py * uy;
    if (t < 0 || t > len) continue;
    const closestSq = (px - ux * t) ** 2 + (py - uy * t) ** 2;
    if (closestSq < (BALL_R * 2) ** 2) return false;
  }
  return true;
}
