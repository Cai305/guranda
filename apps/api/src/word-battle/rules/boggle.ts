import {
  BoggleFoundWordDto,
  BoggleStateDto,
  WordBattleDifficulty,
} from '@mxit2/types';
import { dictionary } from './dictionary';

export const BOGGLE_SIZE = 4;
export const BOGGLE_DURATION_SECONDS = 90;

// Classic 16-cube Boggle letter distribution. The 'Qu' die has one face
// that represents both letters as a single cell.
const DICE: string[][] = [
  ['A', 'A', 'E', 'E', 'G', 'N'],
  ['A', 'B', 'B', 'J', 'O', 'O'],
  ['A', 'C', 'H', 'O', 'P', 'S'],
  ['A', 'F', 'F', 'K', 'P', 'S'],
  ['A', 'O', 'O', 'T', 'T', 'W'],
  ['C', 'I', 'M', 'O', 'T', 'U'],
  ['D', 'E', 'I', 'L', 'R', 'X'],
  ['D', 'E', 'L', 'R', 'V', 'Y'],
  ['D', 'I', 'S', 'T', 'T', 'Y'],
  ['E', 'E', 'G', 'H', 'N', 'W'],
  ['E', 'E', 'I', 'N', 'S', 'U'],
  ['E', 'H', 'R', 'T', 'V', 'W'],
  ['E', 'I', 'O', 'S', 'S', 'T'],
  ['E', 'L', 'R', 'T', 'T', 'Y'],
  ['H', 'I', 'M', 'N', 'QU', 'U'],
  ['H', 'L', 'N', 'N', 'R', 'Z'],
];

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateGrid(): string[] {
  const dice = shuffled(DICE);
  return dice.map((die) => die[Math.floor(Math.random() * die.length)]);
}

function neighbors(index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size)
        result.push(nr * size + nc);
    }
  }
  return result;
}

export function pointsForWord(word: string): number {
  const len = word.length;
  if (len <= 2) return 0;
  if (len <= 4) return 1;
  if (len === 5) return 2;
  if (len === 6) return 3;
  if (len === 7) return 5;
  return 11;
}

// Checks whether `word` can actually be traced as a path of adjacent,
// non-reused cells on this specific grid — prevents submitting real
// dictionary words that simply aren't present on the board.
export function canFormWord(grid: string[], word: string): boolean {
  const upper = word.toUpperCase();
  const size = BOGGLE_SIZE;

  function dfs(index: number, idx: number, visited: boolean[]): boolean {
    const cell = grid[index];
    if (!upper.startsWith(cell, idx)) return false;
    const nextIdx = idx + cell.length;
    if (nextIdx === upper.length) return true;
    for (const n of neighbors(index, size)) {
      if (visited[n]) continue;
      visited[n] = true;
      if (dfs(n, nextIdx, visited)) return true;
      visited[n] = false;
    }
    return false;
  }

  for (let i = 0; i < grid.length; i++) {
    if (upper.startsWith(grid[i])) {
      const visited = new Array(grid.length).fill(false);
      visited[i] = true;
      if (dfs(i, grid[i].length, visited)) return true;
    }
  }
  return false;
}

export function isValidBoggleWord(word: string): boolean {
  return word.length >= 3 && dictionary.has(word.toUpperCase());
}

// ---- Full-board solver, used only to generate the AI's word pool ----

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

let trieRoot: TrieNode | null = null;

function buildTrie(): TrieNode {
  const root: TrieNode = { children: new Map(), isWord: false };
  for (const word of dictionary) {
    if (word.length < 3) continue;
    let node = root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map(), isWord: false };
        node.children.set(ch, next);
      }
      node = next;
    }
    node.isWord = true;
  }
  return root;
}

export function solveBoard(grid: string[]): { word: string; points: number }[] {
  if (!trieRoot) trieRoot = buildTrie();
  const size = BOGGLE_SIZE;
  const found = new Set<string>();

  function dfs(
    index: number,
    node: TrieNode,
    path: string,
    visited: boolean[],
  ) {
    const cell = grid[index];
    // Walk the trie one character at a time (cells like 'QU' are two chars).
    let cursor = node;
    for (const ch of cell) {
      const next = cursor.children.get(ch);
      if (!next) return;
      cursor = next;
    }
    const word = path + cell;
    if (cursor.isWord && word.length >= 3) found.add(word);
    for (const n of neighbors(index, size)) {
      if (visited[n]) continue;
      visited[n] = true;
      dfs(n, cursor, word, visited);
      visited[n] = false;
    }
  }

  for (let i = 0; i < grid.length; i++) {
    const visited = new Array(grid.length).fill(false);
    visited[i] = true;
    dfs(i, trieRoot, '', visited);
  }

  return Array.from(found).map((word) => ({
    word,
    points: pointsForWord(word),
  }));
}

// Picks a believable subset/pace of words for the AI to "find" over the
// round — hard AI finds more, and prioritises higher-scoring words.
export function pickAIWords(
  allWords: { word: string; points: number }[],
  difficulty: WordBattleDifficulty,
): { word: string; points: number }[] {
  const sorted = [...allWords].sort((a, b) => b.points - a.points);
  const count = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 18;
  if (difficulty === 'hard') return sorted.slice(0, count);
  const pool = shuffled(sorted.slice(0, Math.min(sorted.length, count * 3)));
  return pool.slice(0, count);
}

export interface BoggleInternalState extends BoggleStateDto {
  words: BoggleFoundWordDto[]; // full detail, hidden from clients until reveal
}

export function createInitialState(): BoggleInternalState {
  return {
    grid: generateGrid(),
    size: BOGGLE_SIZE,
    durationSeconds: BOGGLE_DURATION_SECONDS,
    startedAt: new Date().toISOString(),
    scores: [0, 0],
    wordCounts: [0, 0],
    words: [],
  };
}

export function submitWord(
  state: BoggleInternalState,
  seatIndex: number,
  rawWord: string,
): { state: BoggleInternalState; error?: string } {
  const word = rawWord.trim().toUpperCase();
  if (isRoundOver(state)) return { state, error: 'Time is up' };
  if (word.length < 3)
    return { state, error: 'Words must be at least 3 letters' };
  if (state.words.some((w) => w.seatIndex === seatIndex && w.word === word)) {
    return { state, error: 'Already found' };
  }
  if (!isValidBoggleWord(word))
    return { state, error: 'Not a recognised word' };
  if (!canFormWord(state.grid, word))
    return { state, error: "That word isn't on this board" };

  const points = pointsForWord(word);
  const words = [...state.words, { seatIndex, word, points }];
  const scores = [...state.scores];
  const wordCounts = [...state.wordCounts];
  scores[seatIndex] += points;
  wordCounts[seatIndex] += 1;

  return { state: { ...state, words, scores, wordCounts } };
}

export function isRoundOver(state: BoggleInternalState): boolean {
  return (
    Date.now() - new Date(state.startedAt).getTime() >=
    state.durationSeconds * 1000
  );
}

// Classic multiplayer Boggle rule: a word found by both players cancels
// out and scores nothing for either.
export function finalizeScores(
  state: BoggleInternalState,
): BoggleInternalState {
  const byWord = new Map<string, Set<number>>();
  for (const w of state.words) {
    if (!byWord.has(w.word)) byWord.set(w.word, new Set());
    byWord.get(w.word)!.add(w.seatIndex);
  }
  const scores = [0, 0];
  const wordCounts = [0, 0];
  const revealed: BoggleFoundWordDto[] = [];
  for (const w of state.words) {
    const seats = byWord.get(w.word)!;
    const cancelled = seats.size > 1;
    revealed.push({ ...w, points: cancelled ? 0 : w.points });
    if (!cancelled) {
      scores[w.seatIndex] += w.points;
      wordCounts[w.seatIndex] += 1;
    }
  }
  return { ...state, scores, wordCounts, revealed };
}
