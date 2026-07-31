// ============================================================
// LifeOS Ludo — pure rules engine, shared by the NestJS server
// (authoritative game logic + AI) and the mobile client (board
// layout + local legal-move highlighting).
//
// Board model: an N-cornered ring (N = 2/4/6/8, one per active
// seat), each corner contributing 13 shared ring squares (the
// classic Ludo per-arm spacing), so the shared ring length scales
// with player count: trackLength = corners * 13.
//
// Per-token "local steps" encoding (relative to that token's own
// seat):
//   -1                                 in home base, not entered
//   0 .. trackLength-1                 on the shared ring
//   trackLength .. FINISH_STEPS-1      in the seat's private home column
//   FINISH_STEPS                       finished (reached center)
// ============================================================

export type LudoMode = '1v1' | '2v2' | '2v2v2' | '4v4' | '1v5';

export interface LudoModeConfig {
  corners: number;
  teams: number[][];
  label: string;
}

export const STEPS_PER_ARM = 13;
export const HOME_STRETCH_LEN = 6;
export const TOKENS_PER_SEAT = 4;

export const LUDO_MODES: Record<LudoMode, LudoModeConfig> = {
  // 1v1 plays on the standard 4-quadrant board using opposite
  // corners (red vs yellow) — the other two seats stay empty,
  // exactly like the real game's 2-player mode.
  '1v1': { corners: 4, teams: [[0], [2]], label: '1 vs 1' },
  '2v2': { corners: 4, teams: [[0, 2], [1, 3]], label: '2 vs 2' },
  '2v2v2': { corners: 6, teams: [[0, 3], [1, 4], [2, 5]], label: '2 vs 2 vs 2' },
  '4v4': { corners: 8, teams: [[0, 2, 4, 6], [1, 3, 5, 7]], label: '4 vs 4' },
  '1v5': { corners: 6, teams: [[0], [1, 2, 3, 4, 5]], label: '1 vs 5' },
};

// Seats that actually hold a player in this mode (ascending).
// Seats outside this list exist on the board but never take turns.
export function getActiveSeats(config: LudoModeConfig): number[] {
  return config.teams.flat().sort((a, b) => a - b);
}

export const SEAT_COLORS = [
  '#D8453C', // red      (top-right on the classic board)
  '#2AA952', // green    (bottom-right)
  '#F0C000', // yellow   (bottom-left)
  '#2D7FD9', // blue     (top-left)
  '#A855F7', // purple
  '#F97316', // orange
  '#14B8A6', // teal
  '#EC4899', // pink
];

export function trackLength(corners: number): number {
  return corners * STEPS_PER_ARM;
}

export function finishSteps(corners: number): number {
  return trackLength(corners) + HOME_STRETCH_LEN - 1;
}

export function seatEntryGlobal(seat: number): number {
  return seat * STEPS_PER_ARM;
}

// The global ring-square index a token occupies, or null if it's
// in base or already off the ring (home column / finished).
export function globalSquareOf(seat: number, localSteps: number, corners: number): number | null {
  const len = trackLength(corners);
  if (localSteps < 0 || localSteps >= len) return null;
  return (seatEntryGlobal(seat) + localSteps) % len;
}

export function isSafeSquare(globalSquare: number, corners: number): boolean {
  for (let s = 0; s < corners; s++) {
    const entry = seatEntryGlobal(s) % trackLength(corners);
    const star = (entry + 8) % trackLength(corners);
    if (globalSquare === entry || globalSquare === star) return true;
  }
  return false;
}

export function isTokenFinished(localSteps: number, corners: number): boolean {
  return localSteps === finishSteps(corners);
}

export function isPlayerFinished(seatTokens: number[], corners: number): boolean {
  return seatTokens.every(t => isTokenFinished(t, corners));
}

export function getTeamOf(seatIndex: number, teams: number[][]): number {
  return teams.findIndex(team => team.includes(seatIndex));
}

export function isTeamFinished(tokens: number[][], team: number[], corners: number): boolean {
  return team.every(seat => isPlayerFinished(tokens[seat], corners));
}

export function createInitialTokens(corners: number): number[][] {
  return Array.from({ length: corners }, () => Array(TOKENS_PER_SEAT).fill(-1));
}

export interface LegalMove {
  tokenIndex: number;
  newLocalSteps: number;
  capturedTargets: { seat: number; token: number }[];
  entersHome: boolean;
  bringsOutOfBase: boolean;
}

// Returns a map from global ring square → seat that owns the blockade there.
// A blockade is 2+ tokens of the SAME seat on the same ring square.
function buildBlockadeMap(tokens: number[][], corners: number): Map<number, number> {
  const seatCounts = new Map<number, Map<number, number>>(); // globalSq → (seat → count)
  for (let s = 0; s < tokens.length; s++) {
    for (const local of tokens[s]) {
      const g = globalSquareOf(s, local, corners);
      if (g === null) continue;
      if (!seatCounts.has(g)) seatCounts.set(g, new Map());
      const m = seatCounts.get(g)!;
      m.set(s, (m.get(s) ?? 0) + 1);
    }
  }
  const blockades = new Map<number, number>();
  seatCounts.forEach((seatMap, g) => {
    seatMap.forEach((count, s) => {
      if (count >= 2) blockades.set(g, s);
    });
  });
  return blockades;
}

export function getLegalMoves(
  tokens: number[][],
  seatIndex: number,
  corners: number,
  diceValue: number,
  teams: number[][],
): LegalMove[] {
  const moves: LegalMove[] = [];
  const myTeam = getTeamOf(seatIndex, teams);
  const seatTokens = tokens[seatIndex];
  const finish = finishSteps(corners);
  const len = trackLength(corners);

  // Squares with 2+ tokens of the same seat = blockade that blocks opponents
  // from landing on OR passing through that square.
  const blockades = buildBlockadeMap(tokens, corners);

  const isBlockedForMe = (globalSq: number): boolean => {
    const blocker = blockades.get(globalSq);
    return blocker !== undefined && getTeamOf(blocker, teams) !== myTeam;
  };

  // Check if the ring portion of the path is obstructed by an opponent blockade.
  const pathBlocked = (fromLocal: number, toLocal: number): boolean => {
    const start = fromLocal === -1 ? 0 : fromLocal + 1;
    const end = Math.min(toLocal, len - 1); // home-stretch squares are private; skip them
    for (let step = start; step <= end; step++) {
      const g = globalSquareOf(seatIndex, step, corners);
      if (g !== null && isBlockedForMe(g)) return true;
    }
    return false;
  };

  for (let tokenIndex = 0; tokenIndex < seatTokens.length; tokenIndex++) {
    const current = seatTokens[tokenIndex];
    let newLocalSteps: number;
    let bringsOutOfBase = false;

    if (current === -1) {
      if (diceValue !== 6) continue;
      newLocalSteps = 0;
      bringsOutOfBase = true;
    } else {
      newLocalSteps = current + diceValue;
      if (newLocalSteps > finish) continue;
    }

    // Block move if the path passes through or lands on an opponent blockade.
    if (pathBlocked(current, newLocalSteps)) continue;

    const capturedTargets: { seat: number; token: number }[] = [];
    const globalSquare = globalSquareOf(seatIndex, newLocalSteps, corners);
    if (globalSquare !== null && !isSafeSquare(globalSquare, corners)) {
      for (let s = 0; s < corners; s++) {
        if (getTeamOf(s, teams) === myTeam) continue;
        tokens[s].forEach((otherSteps, otherTokenIdx) => {
          if (globalSquareOf(s, otherSteps, corners) === globalSquare) {
            capturedTargets.push({ seat: s, token: otherTokenIdx });
          }
        });
      }
    }

    moves.push({
      tokenIndex,
      newLocalSteps,
      capturedTargets,
      entersHome: newLocalSteps === finish,
      bringsOutOfBase,
    });
  }

  return moves;
}

export function applyMove(
  tokens: number[][],
  seatIndex: number,
  move: LegalMove,
): number[][] {
  const next = tokens.map(seatTokens => [...seatTokens]);
  next[seatIndex][move.tokenIndex] = move.newLocalSteps;
  move.capturedTargets.forEach(({ seat, token }) => {
    next[seat][token] = -1;
  });
  return next;
}

// Simple heuristic bot: capture > finish a token > bring a token
// out when nothing is on the board yet > land on a safe square >
// advance the furthest-along token > random.
export function selectAIMove(moves: LegalMove[], seatTokens: number[]): LegalMove | null {
  if (moves.length === 0) return null;

  const byCaptures = [...moves].sort((a, b) => b.capturedTargets.length - a.capturedTargets.length);
  if (byCaptures[0].capturedTargets.length > 0) return byCaptures[0];

  const homeMove = moves.find(m => m.entersHome);
  if (homeMove) return homeMove;

  const allInBase = seatTokens.every(t => t === -1);
  if (allInBase) {
    const bringOut = moves.find(m => m.bringsOutOfBase);
    if (bringOut) return bringOut;
  }

  const safeMove = moves.find(m => m.newLocalSteps > 0 && m.tokenIndex >= 0);
  if (safeMove) {
    const sorted = [...moves].sort((a, b) => b.newLocalSteps - a.newLocalSteps);
    return sorted[0];
  }

  return moves[Math.floor(Math.random() * moves.length)];
}

export function nextActiveSeat(
  currentSeat: number,
  corners: number,
  tokens: number[][],
  activeSeats?: number[],
): number {
  for (let i = 1; i <= corners; i++) {
    const candidate = (currentSeat + i) % corners;
    if (activeSeats && !activeSeats.includes(candidate)) continue;
    if (!isPlayerFinished(tokens[candidate], corners)) return candidate;
  }
  return currentSeat;
}
