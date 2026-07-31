// Pool AI: ghost-ball shot selection. For every legal target ball and every
// pocket, compute the ghost position the cue must reach, check both paths are
// clear, score by cut angle and distance, then add difficulty-based error.

import { Ball, BALL_R, POCKETS, pathClear } from './physics';
import { PoolState, groupOf, onEight } from './rules';

export type PoolDifficulty = 'easy' | 'medium' | 'hard';

const ANGLE_NOISE: Record<PoolDifficulty, number> = {
  easy: 0.09,
  medium: 0.035,
  hard: 0.012,
};

interface AiShot {
  angle: number;
  power: number;
}

export function chooseShot(
  balls: Ball[],
  state: PoolState,
  difficulty: PoolDifficulty,
): AiShot {
  const cue = balls.find(b => b.id === 0)!;
  const me = state.turn;
  const myGroup = state.groups[me];
  const eightTime = onEight(balls, state, me);

  const targets = balls.filter(b => {
    if (b.potted || b.id === 0) return false;
    if (eightTime) return b.id === 8;
    if (state.openTable) return b.id !== 8;
    return groupOf(b.id) === myGroup;
  });

  let best: { angle: number; power: number; score: number } | null = null;

  for (const t of targets) {
    for (const p of POCKETS) {
      // Ghost ball position: behind the target, in line with the pocket
      const toPocket = Math.hypot(p.x - t.x, p.y - t.y);
      if (toPocket === 0) continue;
      const ux = (p.x - t.x) / toPocket;
      const uy = (p.y - t.y) / toPocket;
      const gx = t.x - ux * BALL_R * 2;
      const gy = t.y - uy * BALL_R * 2;

      const toGhost = Math.hypot(gx - cue.x, gy - cue.y);
      if (toGhost < 1) continue;

      // Cut angle: alignment between cue→ghost and target→pocket
      const cx = (gx - cue.x) / toGhost;
      const cy = (gy - cue.y) / toGhost;
      const align = cx * ux + cy * uy; // 1 = dead straight
      if (align < 0.25) continue;     // too thin a cut

      if (!pathClear(balls, cue.x, cue.y, gx, gy, [0, t.id])) continue;
      if (!pathClear(balls, t.x, t.y, p.x, p.y, [0, t.id])) continue;

      const score = align * 100 - toGhost * 0.03 - toPocket * 0.02;
      if (!best || score > best.score) {
        const angle = Math.atan2(gy - cue.y, gx - cue.x);
        const power = Math.min(1, 0.35 + (toGhost + toPocket) / 1400);
        best = { angle, power, score };
      }
    }
  }

  if (!best) {
    // Safety: nudge the nearest legal ball
    const nearest = targets.sort(
      (a, b) =>
        Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y),
    )[0];
    if (nearest) {
      best = {
        angle: Math.atan2(nearest.y - cue.y, nearest.x - cue.x),
        power: 0.45,
        score: 0,
      };
    } else {
      best = { angle: Math.random() * Math.PI * 2, power: 0.5, score: 0 };
    }
  }

  const noise = ANGLE_NOISE[difficulty];
  return {
    angle: best.angle + (Math.random() * 2 - 1) * noise,
    power: Math.max(0.2, Math.min(1, best.power + (Math.random() * 2 - 1) * 0.08)),
  };
}
