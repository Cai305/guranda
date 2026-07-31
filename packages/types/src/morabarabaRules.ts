// ============================================================
// LifeOS Murabaraba (Morabaraba / Umlabalaba) — pure rules engine,
// shared by the NestJS server (authoritative online play) and the
// mobile client (local/AI play + board rendering).
//
// Traditional Southern African strategy game, a Twelve Men's Morris
// variant played on a 2-owner board (24 intersections). Online team
// modes (2v2, 1v3) do NOT change the board itself — it's always
// exactly two "sides" — they only change how many human seats share
// control of each side, taking turns among themselves via `seats` +
// `turnCursor` below.
// ============================================================

export type Player = 0 | 1;
export type Cell = Player | null;

export type Phase = 'placement' | 'movement' | 'flying';

export interface GameState {
  board: Cell[];              // 24 cells
  turn: Player;
  cowsToPlace: [number, number];
  captured: [number, number]; // cows each player has LOST
  pendingShot: boolean;       // current player just made a mill and must shoot
  winner: Player | null;
  draw: boolean;
  movesSinceShot: number;     // for the 10-move endgame draw rule
  lastMove: { from: number | null; to: number } | null;
  lastShot: number | null;
}

export const TOTAL_COWS = 12;

// ── Board graph ────────────────────────────────────────────────────────────

const ADJACENT: number[][] = (() => {
  const adj: number[][] = Array.from({ length: 24 }, () => []);
  const link = (a: number, b: number) => {
    if (!adj[a].includes(b)) adj[a].push(b);
    if (!adj[b].includes(a)) adj[b].push(a);
  };
  for (let r = 0; r < 3; r++) {
    for (let p = 0; p < 8; p++) {
      link(r * 8 + p, r * 8 + ((p + 1) % 8)); // around the ring
    }
  }
  // Every position (mids AND corners — Murabaraba has corner diagonals)
  // connects to the same position on the neighbouring ring.
  for (let r = 0; r < 2; r++) {
    for (let p = 0; p < 8; p++) {
      link(r * 8 + p, (r + 1) * 8 + p);
    }
  }
  return adj;
})();

export const MILLS: [number, number, number][] = (() => {
  const mills: [number, number, number][] = [];
  for (let r = 0; r < 3; r++) {
    const b = r * 8;
    mills.push([b + 0, b + 1, b + 2]);
    mills.push([b + 2, b + 3, b + 4]);
    mills.push([b + 4, b + 5, b + 6]);
    mills.push([b + 6, b + 7, b + 0]);
  }
  for (let p = 0; p < 8; p++) {
    mills.push([p, 8 + p, 16 + p]); // spokes (mids) + diagonals (corners)
  }
  return mills;
})();

// Mills indexed by point for fast lookup
const MILLS_AT: number[][] = (() => {
  const at: number[][] = Array.from({ length: 24 }, () => []);
  MILLS.forEach((m, i) => m.forEach(pt => at[pt].push(i)));
  return at;
})();

export function adjacentTo(point: number): number[] {
  return ADJACENT[point];
}

// ── State helpers ──────────────────────────────────────────────────────────

export function newGame(): GameState {
  return {
    board: Array(24).fill(null),
    turn: 0,
    cowsToPlace: [TOTAL_COWS, TOTAL_COWS],
    captured: [0, 0],
    pendingShot: false,
    winner: null,
    draw: false,
    movesSinceShot: 0,
    lastMove: null,
    lastShot: null,
  };
}

export function cowsOnBoard(s: GameState, p: Player): number {
  return s.board.reduce((n: number, c) => (c === p ? n + 1 : n), 0);
}

export function phaseOf(s: GameState, p: Player): Phase {
  if (s.cowsToPlace[p] > 0) return 'placement';
  return cowsOnBoard(s, p) === 3 ? 'flying' : 'movement';
}

export function isInMill(board: Cell[], point: number): boolean {
  const owner = board[point];
  if (owner === null) return false;
  return MILLS_AT[point].some(mi =>
    MILLS[mi].every(pt => board[pt] === owner)
  );
}

function makesMill(board: Cell[], point: number, p: Player): boolean {
  return MILLS_AT[point].some(mi =>
    MILLS[mi].every(pt => pt === point || board[pt] === p)
  );
}

/** Enemy cows the current player may shoot right now. */
export function shootablePoints(s: GameState): number[] {
  const enemy = (1 - s.turn) as Player;
  const enemyPoints: number[] = [];
  for (let i = 0; i < 24; i++) if (s.board[i] === enemy) enemyPoints.push(i);
  const outsideMills = enemyPoints.filter(pt => !isInMill(s.board, pt));
  return outsideMills.length > 0 ? outsideMills : enemyPoints;
}

/** Legal destination points for a cow (movement/flying). */
export function movesFrom(s: GameState, point: number): number[] {
  if (s.board[point] !== s.turn) return [];
  if (phaseOf(s, s.turn) === 'flying') {
    const empty: number[] = [];
    for (let i = 0; i < 24; i++) if (s.board[i] === null) empty.push(i);
    return empty;
  }
  return ADJACENT[point].filter(pt => s.board[pt] === null);
}

export function hasAnyMove(s: GameState, p: Player): boolean {
  if (s.cowsToPlace[p] > 0) return s.board.some(c => c === null);
  const flying = cowsOnBoard(s, p) === 3;
  for (let i = 0; i < 24; i++) {
    if (s.board[i] !== p) continue;
    if (flying) {
      if (s.board.some(c => c === null)) return true;
    } else if (ADJACENT[i].some(pt => s.board[pt] === null)) {
      return true;
    }
  }
  return false;
}

// ── Actions (all pure: return a new state) ─────────────────────────────────

export type Action =
  | { type: 'place'; to: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'shoot'; at: number };

function endTurnChecks(s: GameState): GameState {
  const next = (1 - s.turn) as Player;
  const nextState = { ...s, turn: next, pendingShot: false };

  // Loss by cow count (only meaningful once that player finished placing)
  const enemyCows = cowsOnBoard(nextState, next) + nextState.cowsToPlace[next];
  if (enemyCows < 3) {
    return { ...nextState, winner: s.turn };
  }
  // Loss by no legal move
  if (!hasAnyMove(nextState, next)) {
    return { ...nextState, winner: s.turn };
  }
  // Endgame draw rule: someone is on 3 cows and 10 moves passed with no shot
  const p0Done = nextState.cowsToPlace[0] === 0 && cowsOnBoard(nextState, 0) === 3;
  const p1Done = nextState.cowsToPlace[1] === 0 && cowsOnBoard(nextState, 1) === 3;
  if ((p0Done || p1Done) && nextState.movesSinceShot >= 10) {
    return { ...nextState, draw: true };
  }
  return nextState;
}

export function applyAction(s: GameState, a: Action): GameState {
  if (s.winner !== null || s.draw) return s;

  if (a.type === 'shoot') {
    if (!s.pendingShot) return s;
    if (!shootablePoints(s).includes(a.at)) return s;
    const board = s.board.slice();
    board[a.at] = null;
    const captured: [number, number] = [...s.captured];
    captured[(1 - s.turn) as Player] += 1;
    return endTurnChecks({
      ...s, board, captured, movesSinceShot: 0, lastShot: a.at,
    });
  }

  if (s.pendingShot) return s; // must shoot first

  if (a.type === 'place') {
    if (s.cowsToPlace[s.turn] <= 0 || s.board[a.to] !== null) return s;
    const board = s.board.slice();
    board[a.to] = s.turn;
    const cowsToPlace: [number, number] = [...s.cowsToPlace];
    cowsToPlace[s.turn] -= 1;
    const mill = makesMill(s.board, a.to, s.turn);
    const base: GameState = {
      ...s, board, cowsToPlace,
      lastMove: { from: null, to: a.to }, lastShot: null,
      movesSinceShot: s.movesSinceShot + 1,
    };
    if (mill && shootablePoints({ ...base, pendingShot: true }).length > 0) {
      return { ...base, pendingShot: true };
    }
    return endTurnChecks(base);
  }

  // move
  if (!movesFrom(s, a.from).includes(a.to)) return s;
  const board = s.board.slice();
  board[a.from] = null;
  board[a.to] = s.turn;
  const mill = makesMill(board.map((c, i) => (i === a.to ? null : c)), a.to, s.turn);
  const base: GameState = {
    ...s, board,
    lastMove: { from: a.from, to: a.to }, lastShot: null,
    movesSinceShot: s.movesSinceShot + 1,
  };
  if (mill && shootablePoints({ ...base, pendingShot: true }).length > 0) {
    return { ...base, pendingShot: true };
  }
  return endTurnChecks(base);
}

/** All legal actions for the current player (used by the AI). */
export function legalActions(s: GameState): Action[] {
  if (s.winner !== null || s.draw) return [];
  if (s.pendingShot) {
    return shootablePoints(s).map(at => ({ type: 'shoot' as const, at }));
  }
  const actions: Action[] = [];
  if (s.cowsToPlace[s.turn] > 0) {
    for (let i = 0; i < 24; i++) {
      if (s.board[i] === null) actions.push({ type: 'place', to: i });
    }
    return actions;
  }
  for (let i = 0; i < 24; i++) {
    if (s.board[i] !== s.turn) continue;
    for (const to of movesFrom(s, i)) actions.push({ type: 'move', from: i, to });
  }
  return actions;
}

// ============================================================
// Online team modes: a thin "who may act for each side" layer on
// top of the 2-sided engine above. The board/rules never gain a
// 3rd/4th owner — 2v2 and 1v3 just let 2–3 human seats take turns
// acting on behalf of one side, rotating round-robin via `turnCursor`.
// ============================================================

export type MurabarabaMode = '1v1' | '2v2' | '1v3';

export interface MurabarabaModeConfig {
  seatsPerSide: [number, number];
  label: string;
}

export const MURABARABA_MODES: Record<MurabarabaMode, MurabarabaModeConfig> = {
  '1v1': { seatsPerSide: [1, 1], label: '1 vs 1' },
  '2v2': { seatsPerSide: [2, 2], label: '2 vs 2' },
  '1v3': { seatsPerSide: [1, 3], label: '1 vs 3' },
};

export function totalSeats(config: MurabarabaModeConfig): number {
  return config.seatsPerSide[0] + config.seatsPerSide[1];
}

export interface MurabarabaSeatDto {
  seatIndex: number;
  side: Player;
  userId: string | null;
  isAI: boolean;
  displayName: string;
}

export interface MurabarabaSeatInput {
  userId: string;
  displayName: string;
  isAI: boolean;
}

// Fills seat 0..seatsPerSide[0]-1 with side 0 and the rest with side 1,
// in the order `players` were supplied (matchmaking queue order).
export function buildSeats(config: MurabarabaModeConfig, players: MurabarabaSeatInput[]): MurabarabaSeatDto[] {
  const seats: MurabarabaSeatDto[] = [];
  let seatIndex = 0;
  for (const side of [0, 1] as Player[]) {
    for (let i = 0; i < config.seatsPerSide[side]; i++) {
      const p = players[seatIndex];
      seats.push({
        seatIndex,
        side,
        userId: p?.userId ?? null,
        isAI: p?.isAI ?? false,
        displayName: p?.displayName ?? '',
      });
      seatIndex++;
    }
  }
  return seats;
}

export function seatsForSide(seats: MurabarabaSeatDto[], side: Player): number[] {
  return seats.filter(s => s.side === side).map(s => s.seatIndex);
}

export function getSeat(seats: MurabarabaSeatDto[], seatIndex: number): MurabarabaSeatDto | undefined {
  return seats.find(s => s.seatIndex === seatIndex);
}

// Round-robins through a side's seats each time that side comes up to
// act again (so, in 2v2/1v3, teammates take fair turns instead of
// racing to submit the same move). `cursor` is the local index (within
// that side's seat list) to use NEXT — callers persist `nextCursor`.
export function nextSeatForSide(
  seats: MurabarabaSeatDto[],
  side: Player,
  cursor: number,
): { seatIndex: number; nextCursor: number } {
  const sideSeats = seatsForSide(seats, side);
  const idx = ((cursor % sideSeats.length) + sideSeats.length) % sideSeats.length;
  return { seatIndex: sideSeats[idx], nextCursor: (idx + 1) % sideSeats.length };
}

export interface MurabarabaGameDto {
  id: string;
  mode: MurabarabaMode;
  seats: MurabarabaSeatDto[];
  state: GameState;
  activeSeat: number;
  turnCursor: [number, number];
  status: 'active' | 'finished';
  winnerSide: Player | null;
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MurabarabaJoinQueuePayload {
  mode: MurabarabaMode;
  userId: string;
  displayName: string;
}

export interface MurabarabaPlacePayload {
  gameId: string;
  userId: string;
  to: number;
}

export interface MurabarabaMovePayload {
  gameId: string;
  userId: string;
  from: number;
  to: number;
}

export interface MurabarabaShootPayload {
  gameId: string;
  userId: string;
  at: number;
}
