// Mirrors apps/mobile/src/games/pool/physics.ts's rackBalls() exactly, so
// the server can seed a freshly-created online game with the same starting
// layout the client will independently (and deterministically) produce.
// Only used once, at game creation — every subsequent state comes from the
// on-turn client's own physics simulation.

const TABLE_W = 1000;
const TABLE_H = 500;
const BALL_R = 14;

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  potted: boolean;
}

export function rackBalls(): Ball[] {
  const balls: Ball[] = [];
  balls.push({
    id: 0,
    x: TABLE_W * 0.25,
    y: TABLE_H / 2,
    vx: 0,
    vy: 0,
    potted: false,
  });

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
