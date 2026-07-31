// Mirrors the initial-state shape from apps/mobile/src/games/pool/rules.ts.
// The server never runs the 8-ball rules engine itself (see pool.service.ts) —
// this is only needed to seed a freshly-created online game.

export interface PoolState {
  turn: 0 | 1;
  groups: [string | null, string | null];
  openTable: boolean;
  winner: 0 | 1 | null;
  winReason: string;
  message: string;
  shotsTaken: number;
}

export function newPoolState(): PoolState {
  return {
    turn: 0,
    groups: [null, null],
    openTable: true,
    winner: null,
    winReason: '',
    message: 'Break!',
    shotsTaken: 0,
  };
}
