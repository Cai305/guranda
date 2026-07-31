import {
  ScrabbleBoardCellDto,
  ScrabbleMoveDto,
  ScrabblePlacement,
  ScrabbleTileDto,
  WordBattleDifficulty,
} from '@mxit2/types';
import { isValidWord } from './dictionary';

export const BOARD_SIZE = 15;
export const CENTER = 7;
export const RACK_SIZE = 7;

type Premium = 'TW' | 'DW' | 'TL' | 'DL' | 'STAR' | null;

// Standard 15x15 Scrabble premium-square layout.
const LAYOUT_ROWS = [
  'T..d...T...d..T',
  '.D...t...t...D.',
  '..D...d.d...D..',
  'd..D...d...D..d',
  '....D.....D....',
  '.t...t...t...t.',
  '..d...d.d...d..',
  'T..d...*...d..T',
  '..d...d.d...d..',
  '.t...t...t...t.',
  '....D.....D....',
  'd..D...d...D..d',
  '..D...d.d...D..',
  '.D...t...t...D.',
  'T..d...T...d..T',
];

const PREMIUM_MAP: Record<string, Premium> = {
  T: 'TW',
  D: 'DW',
  t: 'TL',
  d: 'DL',
  '*': 'STAR',
  '.': null,
};

export const PREMIUM_LAYOUT: Premium[][] = LAYOUT_ROWS.map((row) =>
  row.split('').map((ch) => PREMIUM_MAP[ch]),
);

interface Cell {
  letter: string;
  value: number;
  isBlank: boolean;
  premium: Premium;
}

export type Board = (Cell | null)[][];

const TILE_DISTRIBUTION: [string, number, number][] = [
  ['A', 9, 1],
  ['B', 2, 3],
  ['C', 2, 3],
  ['D', 4, 2],
  ['E', 12, 1],
  ['F', 2, 4],
  ['G', 3, 2],
  ['H', 2, 4],
  ['I', 9, 1],
  ['J', 1, 8],
  ['K', 1, 5],
  ['L', 4, 1],
  ['M', 2, 3],
  ['N', 6, 1],
  ['O', 8, 1],
  ['P', 2, 3],
  ['Q', 1, 10],
  ['R', 6, 1],
  ['S', 4, 1],
  ['T', 6, 1],
  ['U', 4, 1],
  ['V', 2, 4],
  ['W', 2, 4],
  ['X', 1, 8],
  ['Y', 2, 4],
  ['Z', 1, 10],
  ['', 2, 0],
];

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createTileBag(): ScrabbleTileDto[] {
  const bag: ScrabbleTileDto[] = [];
  for (const [letter, count, value] of TILE_DISTRIBUTION) {
    for (let i = 0; i < count; i++) bag.push({ letter, value });
  }
  return shuffled(bag);
}

export function drawTiles(bag: ScrabbleTileDto[], count: number) {
  return { drawn: bag.slice(0, count), remaining: bag.slice(count) };
}

export interface ScrabbleInternalState {
  board: Board;
  bag: ScrabbleTileDto[];
  racks: ScrabbleTileDto[][];
  scores: number[];
  currentSeat: number;
  lastMove: ScrabbleMoveDto | null;
  consecutivePasses: number;
  isFirstMove: boolean;
  status: 'active' | 'finished';
}

export function createInitialState(): ScrabbleInternalState {
  let bag = createTileBag();
  const racks: ScrabbleTileDto[][] = [];
  for (let seat = 0; seat < 2; seat++) {
    const { drawn, remaining } = drawTiles(bag, RACK_SIZE);
    racks.push(drawn);
    bag = remaining;
  }
  return {
    board: Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null),
    ),
    bag,
    racks,
    scores: [0, 0],
    currentSeat: 0,
    lastMove: null,
    consecutivePasses: 0,
    isFirstMove: true,
    status: 'active',
  };
}

interface WordSpan {
  word: string;
  cells: { row: number; col: number }[];
}

function extract(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
): WordSpan {
  let r = row,
    c = col;
  while (
    r - dr >= 0 &&
    r - dr < BOARD_SIZE &&
    c - dc >= 0 &&
    c - dc < BOARD_SIZE &&
    board[r - dr][c - dc]
  ) {
    r -= dr;
    c -= dc;
  }
  const cells: { row: number; col: number }[] = [];
  let word = '';
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c]) {
    cells.push({ row: r, col: c });
    word += board[r][c]!.letter;
    r += dr;
    c += dc;
  }
  return { word, cells };
}

interface PlaceResult {
  valid: boolean;
  error?: string;
  wordsFormed?: string[];
  points?: number;
  newBoard?: Board;
  usedRackIndices?: number[];
}

export function placeWord(
  board: Board,
  placements: ScrabblePlacement[],
  rack: ScrabbleTileDto[],
  isFirstMove: boolean,
): PlaceResult {
  if (placements.length === 0)
    return { valid: false, error: 'No tiles placed' };

  for (const p of placements) {
    if (p.row < 0 || p.row >= BOARD_SIZE || p.col < 0 || p.col >= BOARD_SIZE) {
      return { valid: false, error: 'Out of bounds' };
    }
    if (board[p.row][p.col])
      return { valid: false, error: 'Cell already occupied' };
  }
  const cellKeys = new Set(placements.map((p) => `${p.row},${p.col}`));
  if (cellKeys.size !== placements.length)
    return { valid: false, error: 'Duplicate cell' };

  const usedIndices = placements.map((p) => p.fromRackIndex);
  if (new Set(usedIndices).size !== usedIndices.length)
    return { valid: false, error: 'Reused rack tile' };
  for (const idx of usedIndices) {
    if (!rack[idx]) return { valid: false, error: 'Invalid rack tile' };
  }

  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  let horizontal: boolean;
  if (placements.length > 1) {
    if (rows.size === 1) horizontal = true;
    else if (cols.size === 1) horizontal = false;
    else
      return { valid: false, error: 'Tiles must be in a single row or column' };
  } else {
    horizontal = true; // resolved below
  }

  const tempBoard: Board = board.map((row) => row.slice());
  for (const p of placements) {
    const rackTile = rack[p.fromRackIndex];
    const isBlank = rackTile.letter === '';
    tempBoard[p.row][p.col] = {
      letter: p.letter.toUpperCase(),
      value: isBlank ? 0 : rackTile.value,
      isBlank,
      premium: PREMIUM_LAYOUT[p.row][p.col],
    };
  }

  let primary: WordSpan;
  if (placements.length > 1) {
    const dr = horizontal ? 0 : 1,
      dc = horizontal ? 1 : 0;
    primary = extract(tempBoard, placements[0].row, placements[0].col, dr, dc);
    for (const p of placements) {
      if (!primary.cells.some((c) => c.row === p.row && c.col === p.col)) {
        return { valid: false, error: 'Tiles are not contiguous' };
      }
    }
  } else {
    const p = placements[0];
    const h = extract(tempBoard, p.row, p.col, 0, 1);
    const v = extract(tempBoard, p.row, p.col, 1, 0);
    if (h.word.length > 1) {
      primary = h;
      horizontal = true;
    } else if (v.word.length > 1) {
      primary = v;
      horizontal = false;
    } else primary = h;
  }

  const wordsFormed: WordSpan[] = [primary];
  const crossDr = horizontal ? 1 : 0,
    crossDc = horizontal ? 0 : 1;
  for (const p of placements) {
    const cross = extract(tempBoard, p.row, p.col, crossDr, crossDc);
    if (cross.word.length > 1) wordsFormed.push(cross);
  }

  const touchesCenter = placements.some(
    (p) => p.row === CENTER && p.col === CENTER,
  );
  if (isFirstMove) {
    if (!touchesCenter)
      return { valid: false, error: 'First move must cover the center square' };
    if (primary.word.length < 2)
      return { valid: false, error: 'Word must be at least 2 letters' };
  } else {
    const connectsToExisting = wordsFormed.some((w) =>
      w.cells.some((c) => board[c.row][c.col] !== null),
    );
    if (!connectsToExisting)
      return { valid: false, error: 'Word must connect to existing tiles' };
    if (primary.word.length < 2 && wordsFormed.length === 1) {
      return { valid: false, error: 'Word must be at least 2 letters' };
    }
  }

  const realWords = wordsFormed.filter((w) => w.word.length >= 2);
  for (const w of realWords) {
    if (!isValidWord(w.word))
      return { valid: false, error: `"${w.word}" is not a valid word` };
  }

  let totalPoints = 0;
  for (const w of realWords) {
    let wordMultiplier = 1;
    let wordScore = 0;
    for (const cell of w.cells) {
      const tile = tempBoard[cell.row][cell.col]!;
      const isNew = placements.some(
        (p) => p.row === cell.row && p.col === cell.col,
      );
      let letterValue = tile.value;
      if (isNew && tile.premium === 'DL') letterValue *= 2;
      if (isNew && tile.premium === 'TL') letterValue *= 3;
      wordScore += letterValue;
      if (isNew && (tile.premium === 'DW' || tile.premium === 'STAR'))
        wordMultiplier *= 2;
      if (isNew && tile.premium === 'TW') wordMultiplier *= 3;
    }
    totalPoints += wordScore * wordMultiplier;
  }
  if (placements.length === RACK_SIZE) totalPoints += 50; // bingo bonus

  return {
    valid: true,
    wordsFormed: realWords.map((w) => w.word),
    points: totalPoints,
    newBoard: tempBoard,
    usedRackIndices: usedIndices,
  };
}

export function applyPlacement(
  state: ScrabbleInternalState,
  seatIndex: number,
  placements: ScrabblePlacement[],
): { state: ScrabbleInternalState; error?: string } {
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };
  const result = placeWord(
    state.board,
    placements,
    state.racks[seatIndex],
    state.isFirstMove,
  );
  if (!result.valid) return { state, error: result.error };

  const rack = [...state.racks[seatIndex]];
  const sortedIndices = [...result.usedRackIndices!].sort((a, b) => b - a);
  for (const idx of sortedIndices) rack.splice(idx, 1);

  let bag = [...state.bag];
  const needed = RACK_SIZE - rack.length;
  if (needed > 0) {
    const { drawn, remaining } = drawTiles(bag, needed);
    rack.push(...drawn);
    bag = remaining;
  }

  const racks = [...state.racks];
  racks[seatIndex] = rack;
  const scores = [...state.scores];
  scores[seatIndex] += result.points!;

  return {
    state: {
      ...state,
      board: result.newBoard!,
      racks,
      bag,
      scores,
      currentSeat: 1 - seatIndex,
      lastMove: {
        seatIndex,
        wordsFormed: result.wordsFormed!,
        points: result.points!,
      },
      consecutivePasses: 0,
      isFirstMove: false,
    },
  };
}

export function applyPass(
  state: ScrabbleInternalState,
  seatIndex: number,
): { state: ScrabbleInternalState; error?: string } {
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };
  const consecutivePasses = state.consecutivePasses + 1;
  const finished = consecutivePasses >= 4; // both players pass twice running
  return {
    state: {
      ...state,
      currentSeat: 1 - seatIndex,
      consecutivePasses,
      lastMove: { seatIndex, wordsFormed: [], points: 0, passed: true },
      status: finished ? 'finished' : 'active',
    },
  };
}

export function applyExchange(
  state: ScrabbleInternalState,
  seatIndex: number,
  rackIndices: number[],
): { state: ScrabbleInternalState; error?: string } {
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };
  if (state.bag.length < rackIndices.length) {
    return { state, error: 'Not enough tiles left in the bag to exchange' };
  }
  const rack = [...state.racks[seatIndex]];
  const tilesToReturn = rackIndices.map((i) => rack[i]);
  const sorted = [...rackIndices].sort((a, b) => b - a);
  for (const idx of sorted) rack.splice(idx, 1);

  const bagWithReturns = shuffled([...state.bag, ...tilesToReturn]);
  const { drawn, remaining } = drawTiles(bagWithReturns, rackIndices.length);
  rack.push(...drawn);

  const racks = [...state.racks];
  racks[seatIndex] = rack;

  return {
    state: {
      ...state,
      racks,
      bag: remaining,
      currentSeat: 1 - seatIndex,
      consecutivePasses: 0,
      lastMove: { seatIndex, wordsFormed: [], points: 0, exchanged: true },
    },
  };
}

export function checkGameOver(state: ScrabbleInternalState): boolean {
  if (state.status === 'finished') return true;
  if (state.bag.length === 0 && state.racks.some((r) => r.length === 0))
    return true;
  return false;
}

// Standard endgame rule: whoever emptied their rack gets the sum of every
// opponent's remaining tile values added to their score (and it's
// deducted from the opponents).
export function finalizeEndgame(
  state: ScrabbleInternalState,
): ScrabbleInternalState {
  const scores = [...state.scores];
  const emptySeat = state.racks.findIndex((r) => r.length === 0);
  if (emptySeat !== -1) {
    let deducted = 0;
    state.racks.forEach((rack, seat) => {
      if (seat === emptySeat) return;
      const sum = rack.reduce((s, t) => s + t.value, 0);
      scores[seat] -= sum;
      deducted += sum;
    });
    scores[emptySeat] += deducted;
  }
  return { ...state, scores, status: 'finished' };
}

export function sanitizeScrabbleState(
  state: ScrabbleInternalState,
  forSeat: number,
) {
  const board: ScrabbleBoardCellDto[][] = state.board.map((row, r) =>
    row.map((cell, c) => ({
      tile: cell
        ? { letter: cell.isBlank ? '' : cell.letter, value: cell.value }
        : null,
      premium: PREMIUM_LAYOUT[r][c],
    })),
  );
  const opponentSeat = 1 - forSeat;
  return {
    board,
    rack: state.racks[forSeat] ?? [],
    opponentRackCount: state.racks[opponentSeat]?.length ?? 0,
    bagCount: state.bag.length,
    scores: state.scores,
    currentSeat: state.currentSeat,
    lastMove: state.lastMove,
    consecutivePasses: state.consecutivePasses,
    isFirstMove: state.isFirstMove,
  };
}

// ---- Bounded greedy AI ----
// Not exhaustive/optimal — tries a capped number of anchor+direction+rack
// permutation combinations and keeps the highest-scoring valid placement
// found within budget. Reliably finds a decent move most turns; passes
// when nothing valid turns up in budget.

function* permutations(indices: number[], size: number): Generator<number[]> {
  if (size === 0) {
    yield [];
    return;
  }
  for (let i = 0; i < indices.length; i++) {
    const rest = [...indices.slice(0, i), ...indices.slice(i + 1)];
    for (const p of permutations(rest, size - 1)) yield [indices[i], ...p];
  }
}

function findAnchors(
  board: Board,
  isFirstMove: boolean,
): { row: number; col: number }[] {
  if (isFirstMove) return [{ row: CENTER, col: CENTER }];
  const anchors: { row: number; col: number }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) continue;
      const hasNeighbor =
        (r > 0 && board[r - 1][c]) ||
        (r < BOARD_SIZE - 1 && board[r + 1][c]) ||
        (c > 0 && board[r][c - 1]) ||
        (c < BOARD_SIZE - 1 && board[r][c + 1]);
      if (hasNeighbor) anchors.push({ row: r, col: c });
    }
  }
  return anchors;
}

export function chooseAIMove(
  state: ScrabbleInternalState,
  seatIndex: number,
  difficulty: WordBattleDifficulty,
): { placements: ScrabblePlacement[] } | null {
  const rack = state.racks[seatIndex];
  const board = state.board;
  const anchors = shuffled(findAnchors(board, state.isFirstMove));

  const maxAnchors =
    difficulty === 'hard' ? 30 : difficulty === 'medium' ? 15 : 8;
  const maxSubsetSize =
    difficulty === 'hard' ? 5 : difficulty === 'easy' ? 3 : 4;
  const maxAttempts =
    difficulty === 'hard' ? 6000 : difficulty === 'easy' ? 1500 : 3000;
  const candidateAnchors = anchors.slice(0, maxAnchors);

  let best: { placements: ScrabblePlacement[]; points: number } | null = null;
  let attempts = 0;

  outer: for (const anchor of candidateAnchors) {
    for (const horizontal of [true, false]) {
      const dr = horizontal ? 0 : 1,
        dc = horizontal ? 1 : 0;
      for (
        let subsetSize = 1;
        subsetSize <= Math.min(maxSubsetSize, rack.length);
        subsetSize++
      ) {
        for (const perm of permutations(
          rack.map((_, i) => i),
          subsetSize,
        )) {
          attempts++;
          if (attempts > maxAttempts) break outer;

          const placements: ScrabblePlacement[] = [];
          let r = anchor.row,
            c = anchor.col;
          let ok = true;
          for (const rackIdx of perm) {
            while (r < BOARD_SIZE && c < BOARD_SIZE && board[r][c]) {
              r += dr;
              c += dc;
            }
            if (r >= BOARD_SIZE || c >= BOARD_SIZE) {
              ok = false;
              break;
            }
            const tile = rack[rackIdx];
            const letter = tile.letter || 'E';
            placements.push({ row: r, col: c, letter, fromRackIndex: rackIdx });
            r += dr;
            c += dc;
          }
          if (!ok || placements.length === 0) continue;

          const result = placeWord(board, placements, rack, state.isFirstMove);
          if (result.valid && (!best || result.points! > best.points)) {
            best = { placements, points: result.points! };
          }
        }
      }
    }
  }

  if (!best) return null;
  if (difficulty === 'easy' && Math.random() < 0.25) return null;
  return { placements: best.placements };
}
