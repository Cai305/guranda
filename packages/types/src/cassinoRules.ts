// ============================================================
// Cassino (South African house rules) — pure rules engine, shared
// by the NestJS server (authoritative online play) and the mobile
// client (offline/local AI play + board rendering).
//
// 1v1 / 2v2 partners / free-for-all. Each player is dealt 10 cards
// (SA house rule — the traditional game deals 4), 4 cards face up
// on the table. On a turn a player captures, builds, extends/takes
// over a build, or trails a card. When every hand empties and the
// deck still has cards, hands are redealt; when the deck is spent
// too, the round ends — the last capturer takes any remaining
// table cards — and the 11-point SA scoring table is applied.
//
// Card numeric value for sums/builds: ace = 1, 2-10 = face value.
// Jack/Queen/King have no numeric value — they only match by rank
// (this matches standard Cassino; the spec doesn't override it).
// ============================================================

import type { Card, Suit } from './fiveCardsRules';

export type { Card, Suit };

export type CassinoMatchMode = 'ONE_V_ONE' | 'TWO_V_TWO' | 'FFA';
export type CassinoDifficulty = 'easy' | 'medium' | 'hard';

export interface CassinoBuild {
  id: string;
  ownerSeat: number;
  cards: Card[];
  value: number;
}

export interface CassinoSeat {
  seatIndex: number;
  userId: string | null;
  isAI: boolean;
  displayName: string;
  difficulty?: CassinoDifficulty;
  team?: 0 | 1;
  hand: Card[];
  capturedPile: Card[];
  roundScore: number;
  matchScore: number;
  sweeps: number;
}

export interface CassinoState {
  deck: Card[];
  table: Card[];
  builds: CassinoBuild[];
  seats: CassinoSeat[];
  currentSeat: number;
  targetScore: number;
  handSize: number;
  lastCapturerSeat: number | null;
  round: number;
  mode: CassinoMatchMode;
  winnerSeat: number | null;
  winnerTeam: number | null;
  status: 'active' | 'finished';
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export function createShoe(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  }
  return shuffled(deck);
}

/** Numeric value for sums/builds; null for J/Q/K which only match by rank. */
export function cardValue(card: Card): number | null {
  return card.rank >= 1 && card.rank <= 10 ? card.rank : null;
}

function cardKey(c: Card): string {
  return `${c.suit}${c.rank}`;
}

export interface CassinoSeatInput {
  userId: string | null;
  isAI: boolean;
  displayName: string;
  difficulty?: CassinoDifficulty;
  team?: 0 | 1;
}

export function newMatch(
  seatInputs: CassinoSeatInput[],
  mode: CassinoMatchMode,
  targetScore: number,
  handSize = 10,
): CassinoState {
  const seats: CassinoSeat[] = seatInputs.map((s, seatIndex) => ({
    seatIndex,
    userId: s.userId,
    isAI: s.isAI,
    displayName: s.displayName,
    difficulty: s.difficulty,
    team: s.team,
    hand: [],
    capturedPile: [],
    roundScore: 0,
    matchScore: 0,
    sweeps: 0,
  }));
  const state: CassinoState = {
    deck: [],
    table: [],
    builds: [],
    seats,
    currentSeat: 0,
    targetScore,
    handSize,
    lastCapturerSeat: null,
    round: 0,
    mode,
    winnerSeat: null,
    winnerTeam: null,
    status: 'active',
  };
  return dealRound(state);
}

function cloneState(state: CassinoState): CassinoState {
  return {
    ...state,
    deck: [...state.deck],
    table: [...state.table],
    builds: state.builds.map((b) => ({ ...b, cards: [...b.cards] })),
    seats: state.seats.map((s) => ({
      ...s,
      hand: [...s.hand],
      capturedPile: [...s.capturedPile],
    })),
  };
}

/** Fresh shuffle + deal for a new round (hand-size cards/player, 4 on the table). */
export function dealRound(state: CassinoState): CassinoState {
  const next = cloneState(state);
  next.deck = createShoe();
  next.table = next.deck.splice(0, 4);
  next.builds = [];
  next.lastCapturerSeat = null;
  next.round += 1;
  for (const seat of next.seats) {
    seat.hand = next.deck.splice(0, next.handSize);
    seat.capturedPile = [];
    seat.roundScore = 0;
  }
  next.currentSeat = 0;
  return next;
}

/** Redeal handSize cards to every seat once all hands are simultaneously empty. */
function redealIfAllHandsEmpty(state: CassinoState): CassinoState {
  const allEmpty = state.seats.every((s) => s.hand.length === 0);
  if (!allEmpty) return state;
  if (state.deck.length === 0) return endRound(state);

  const next = cloneState(state);
  const perSeat = Math.min(next.handSize, Math.floor(next.deck.length / next.seats.length) || 1);
  for (const seat of next.seats) {
    seat.hand = next.deck.splice(0, Math.min(perSeat, next.deck.length));
  }
  if (next.deck.length === 0 && next.seats.every((s) => s.hand.length === 0)) {
    return endRound(next);
  }
  return next;
}

// ---- Legal move enumeration ----

export type CassinoMoveKind = 'capture' | 'build' | 'extendBuild' | 'takeOverBuild' | 'trail';

export interface CassinoMove {
  kind: CassinoMoveKind;
  card: Card;
  targetIds: string[]; // table-card keys and/or build ids consumed
  buildId?: string;
  buildValue?: number;
}

/** Every subset of the table's loose cards (bounded — table is small). */
function subsetsOf<T>(items: T[]): T[][] {
  const result: T[][] = [[]];
  for (const item of items) {
    const additions = result.map((s) => [...s, item]);
    result.push(...additions);
  }
  return result.filter((s) => s.length > 0);
}

export function legalMoves(state: CassinoState, seatIndex: number): CassinoMove[] {
  const seat = state.seats[seatIndex];
  const moves: CassinoMove[] = [];
  if (state.status !== 'active' || state.currentSeat !== seatIndex) return moves;

  for (const played of seat.hand) {
    const value = cardValue(played);

    // Rank-match captures (loose table cards sharing the played card's rank).
    const rankMatches = state.table.filter((c) => c.rank === played.rank);
    if (rankMatches.length > 0) {
      moves.push({ kind: 'capture', card: played, targetIds: rankMatches.map(cardKey) });
    }

    // Sum-match captures over loose numeric table cards.
    if (value !== null) {
      const numericTable = state.table.filter((c) => cardValue(c) !== null);
      for (const subset of subsetsOf(numericTable)) {
        const sum = subset.reduce((acc, c) => acc + (cardValue(c) ?? 0), 0);
        if (sum === value) {
          moves.push({ kind: 'capture', card: played, targetIds: subset.map(cardKey) });
        }
      }
      // Captures of existing builds whose value matches.
      for (const build of state.builds) {
        if (build.value === value) {
          moves.push({ kind: 'capture', card: played, targetIds: [build.id] });
        }
      }

      // Builds: combine the played card with a numeric table subset to reach
      // a value the player holds another card to capture later.
      const restOfHand = seat.hand.filter((c) => c !== played);
      for (const subset of subsetsOf(numericTable)) {
        const buildValue = value + subset.reduce((acc, c) => acc + (cardValue(c) ?? 0), 0);
        if (buildValue > 10) continue;
        const canCapture = restOfHand.some((c) => cardValue(c) === buildValue || c.rank === buildValue);
        if (canCapture) {
          moves.push({
            kind: 'build',
            card: played,
            targetIds: subset.map(cardKey),
            buildValue,
          });
        }
      }

      // Extend / take over an existing build.
      for (const build of state.builds) {
        const newValue = build.value + value;
        if (newValue > 10) continue;
        const restOfHand = seat.hand.filter((c) => c !== played);
        const canCapture = restOfHand.some((c) => cardValue(c) === newValue || c.rank === newValue);
        if (canCapture) {
          moves.push({
            kind: build.ownerSeat === seatIndex ? 'extendBuild' : 'takeOverBuild',
            card: played,
            targetIds: [build.id],
            buildId: build.id,
            buildValue: newValue,
          });
        }
      }
    }

    moves.push({ kind: 'trail', card: played, targetIds: [] });
  }
  return moves;
}

// ---- Move application ----

function removeFromHand(seat: CassinoSeat, card: Card) {
  const idx = seat.hand.findIndex((c) => cardKey(c) === cardKey(card));
  if (idx === -1) return false;
  seat.hand.splice(idx, 1);
  return true;
}

function advanceTurn(state: CassinoState): CassinoState {
  let next = { ...state, currentSeat: (state.currentSeat + 1) % state.seats.length };
  next = redealIfAllHandsEmpty(next);
  return next;
}

export function capture(
  state: CassinoState,
  seatIndex: number,
  playedCard: Card,
  targetIds: string[],
): { state: CassinoState; error?: string } {
  if (state.status !== 'active') return { state, error: 'Round is finished' };
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };

  const valid = legalMoves(state, seatIndex).find(
    (m) =>
      m.kind === 'capture' &&
      cardKey(m.card) === cardKey(playedCard) &&
      m.targetIds.length === targetIds.length &&
      m.targetIds.every((t) => targetIds.includes(t)),
  );
  if (!valid) return { state, error: 'Illegal capture' };

  const next = cloneState(state);
  const seat = next.seats[seatIndex];
  removeFromHand(seat, playedCard);

  const capturedCards: Card[] = [playedCard];
  for (const targetId of targetIds) {
    const buildIdx = next.builds.findIndex((b) => b.id === targetId);
    if (buildIdx !== -1) {
      capturedCards.push(...next.builds[buildIdx].cards);
      next.builds.splice(buildIdx, 1);
      continue;
    }
    const tableIdx = next.table.findIndex((c) => cardKey(c) === targetId);
    if (tableIdx !== -1) {
      capturedCards.push(next.table[tableIdx]);
      next.table.splice(tableIdx, 1);
    }
  }
  seat.capturedPile.push(...capturedCards);
  next.lastCapturerSeat = seatIndex;

  if (next.table.length === 0 && next.builds.length === 0) {
    seat.sweeps += 1;
  }

  return { state: advanceTurn(next) };
}

export function build(
  state: CassinoState,
  seatIndex: number,
  playedCard: Card,
  tableCardIds: string[],
  buildValue: number,
): { state: CassinoState; error?: string } {
  if (state.status !== 'active') return { state, error: 'Round is finished' };
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };

  const valid = legalMoves(state, seatIndex).find(
    (m) =>
      m.kind === 'build' &&
      cardKey(m.card) === cardKey(playedCard) &&
      m.buildValue === buildValue &&
      m.targetIds.length === tableCardIds.length &&
      m.targetIds.every((t) => tableCardIds.includes(t)),
  );
  if (!valid) return { state, error: 'Illegal build' };

  const next = cloneState(state);
  const seat = next.seats[seatIndex];
  removeFromHand(seat, playedCard);

  const buildCards: Card[] = [playedCard];
  for (const id of tableCardIds) {
    const idx = next.table.findIndex((c) => cardKey(c) === id);
    if (idx !== -1) {
      buildCards.push(next.table[idx]);
      next.table.splice(idx, 1);
    }
  }
  next.builds.push({
    id: `b${next.round}-${next.builds.length}-${Date.now()}`,
    ownerSeat: seatIndex,
    cards: buildCards,
    value: buildValue,
  });

  return { state: advanceTurn(next) };
}

export function extendOrTakeOverBuild(
  state: CassinoState,
  seatIndex: number,
  buildId: string,
  addedCard: Card,
  newValue: number,
): { state: CassinoState; error?: string } {
  if (state.status !== 'active') return { state, error: 'Round is finished' };
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };

  const valid = legalMoves(state, seatIndex).find(
    (m) =>
      (m.kind === 'extendBuild' || m.kind === 'takeOverBuild') &&
      m.buildId === buildId &&
      cardKey(m.card) === cardKey(addedCard) &&
      m.buildValue === newValue,
  );
  if (!valid) return { state, error: 'Illegal build modification' };

  const next = cloneState(state);
  const seat = next.seats[seatIndex];
  removeFromHand(seat, addedCard);

  const buildIdx = next.builds.findIndex((b) => b.id === buildId);
  next.builds[buildIdx] = {
    ...next.builds[buildIdx],
    cards: [...next.builds[buildIdx].cards, addedCard],
    value: newValue,
    ownerSeat: seatIndex, // last to touch a build owns it
  };

  return { state: advanceTurn(next) };
}

export function trail(
  state: CassinoState,
  seatIndex: number,
  card: Card,
): { state: CassinoState; error?: string } {
  if (state.status !== 'active') return { state, error: 'Round is finished' };
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };

  const next = cloneState(state);
  const seat = next.seats[seatIndex];
  if (!removeFromHand(seat, card)) return { state, error: 'That card is not in your hand' };
  next.table.push(card);

  return { state: advanceTurn(next) };
}

export function detectSweep(beforeTableAndBuildLen: number, afterTableAndBuildLen: number): boolean {
  return beforeTableAndBuildLen > 0 && afterTableAndBuildLen === 0;
}

// ---- Round end + 11-point SA scoring ----

function teamOf(state: CassinoState, seatIndex: number): number {
  return state.mode === 'TWO_V_TWO' ? (state.seats[seatIndex].team ?? seatIndex % 2) : seatIndex;
}

export interface ScoreBreakdown {
  aces: number;
  twoSpades: number;
  fiveSpades: number;
  tenDiamonds: number;
  mostSpades: number;
  mostCards: number;
}

export function scoreRound(
  state: CassinoState,
): { groupId: number; seatIndexes: number[]; points: number; breakdown: ScoreBreakdown }[] {
  // Remaining table cards (and any un-captured builds) go to the last capturer.
  const groups = new Map<number, { seatIndexes: number[]; pile: Card[] }>();
  for (const seat of state.seats) {
    const g = teamOf(state, seat.seatIndex);
    if (!groups.has(g)) groups.set(g, { seatIndexes: [], pile: [] });
    const entry = groups.get(g)!;
    entry.seatIndexes.push(seat.seatIndex);
    entry.pile.push(...seat.capturedPile);
  }

  const results: { groupId: number; seatIndexes: number[]; points: number; breakdown: ScoreBreakdown }[] = [];
  const breakdowns = new Map<number, ScoreBreakdown>();
  for (const [groupId] of groups) {
    breakdowns.set(groupId, {
      aces: 0,
      twoSpades: 0,
      fiveSpades: 0,
      tenDiamonds: 0,
      mostSpades: 0,
      mostCards: 0,
    });
  }

  // Per-card fixed points: 4 aces (1 each), 2S, 5S, 10D (2pts).
  for (const [groupId, g] of groups) {
    const bd = breakdowns.get(groupId)!;
    bd.aces = g.pile.filter((c) => c.rank === 1).length;
    bd.twoSpades = g.pile.some((c) => c.rank === 2 && c.suit === 'S') ? 1 : 0;
    bd.fiveSpades = g.pile.some((c) => c.rank === 5 && c.suit === 'S') ? 1 : 0;
    bd.tenDiamonds = g.pile.some((c) => c.rank === 10 && c.suit === 'D') ? 2 : 0;
  }

  // Most spades (1pt, split on a tie).
  const spadeCounts = [...groups.entries()].map(([groupId, g]) => ({
    groupId,
    count: g.pile.filter((c) => c.suit === 'S').length,
  }));
  const maxSpades = Math.max(...spadeCounts.map((s) => s.count), 0);
  const spadeWinners = maxSpades > 0 ? spadeCounts.filter((s) => s.count === maxSpades) : [];
  for (const w of spadeWinners) {
    breakdowns.get(w.groupId)!.mostSpades = 1 / spadeWinners.length;
  }

  // Most cards (1pt for exactly 20, 2pts for >20; split on a tie).
  const cardCounts = [...groups.entries()].map(([groupId, g]) => ({ groupId, count: g.pile.length }));
  const maxCards = Math.max(...cardCounts.map((c) => c.count), 0);
  const cardWinners = maxCards > 0 ? cardCounts.filter((c) => c.count === maxCards) : [];
  const mostCardsPoints = maxCards > 20 ? 2 : maxCards === 20 ? 1 : 0;
  for (const w of cardWinners) {
    if (mostCardsPoints > 0) breakdowns.get(w.groupId)!.mostCards = mostCardsPoints / cardWinners.length;
  }

  for (const [groupId, entry] of groups) {
    const bd = breakdowns.get(groupId)!;
    const points = bd.aces + bd.twoSpades + bd.fiveSpades + bd.tenDiamonds + bd.mostSpades + bd.mostCards;
    results.push({ groupId, seatIndexes: entry.seatIndexes, points, breakdown: bd });
  }
  return results;
}

export function endRound(state: CassinoState): CassinoState {
  const next = cloneState(state);
  if (next.lastCapturerSeat !== null) {
    const remaining = [...next.table, ...next.builds.flatMap((b) => b.cards)];
    next.seats[next.lastCapturerSeat].capturedPile.push(...remaining);
  }
  next.table = [];
  next.builds = [];

  const scores = scoreRound(next);
  for (const result of scores) {
    for (const seatIndex of result.seatIndexes) {
      next.seats[seatIndex].roundScore = result.points;
      next.seats[seatIndex].matchScore += result.points / result.seatIndexes.length;
    }
  }

  const reachedTarget = scores.find((r) => {
    const groupTotal = next.seats.find((s) => s.seatIndex === r.seatIndexes[0])!.matchScore;
    return groupTotal >= next.targetScore;
  });

  if (reachedTarget) {
    next.status = 'finished';
    if (next.mode === 'TWO_V_TWO') {
      next.winnerTeam = reachedTarget.groupId;
    } else {
      next.winnerSeat = reachedTarget.seatIndexes[0];
    }
    return next;
  }

  return dealRound(next);
}

// ---- Anti-cheat: redact hidden information before broadcasting ----

export function sanitizeCassinoStateForSeat(state: CassinoState, seatIndex: number): CassinoState {
  return {
    ...state,
    deck: [],
    seats: state.seats.map((s) =>
      s.seatIndex === seatIndex
        ? { ...s, hand: [...s.hand] }
        : { ...s, hand: new Array(s.hand.length).fill(null) as unknown as Card[] },
    ),
  };
}

export function sanitizeCassinoStateForSpectator(state: CassinoState): CassinoState {
  return {
    ...state,
    deck: [],
    seats: state.seats.map((s) => ({
      ...s,
      hand: new Array(s.hand.length).fill(null) as unknown as Card[],
    })),
  };
}

// ---- AI ----

function scoreValueOfCards(cards: Card[]): number {
  let score = 0;
  for (const c of cards) {
    if (c.rank === 1) score += 3; // aces are valuable (1pt each + denies opponent)
    if (c.rank === 2 && c.suit === 'S') score += 2;
    if (c.rank === 5 && c.suit === 'S') score += 2;
    if (c.rank === 10 && c.suit === 'D') score += 3;
    if (c.suit === 'S') score += 1;
    score += 0.5; // most-cards bonus pressure
  }
  return score;
}

export function pickAIMove(
  state: CassinoState,
  seatIndex: number,
  difficulty: CassinoDifficulty,
): CassinoMove {
  const moves = legalMoves(state, seatIndex);
  const captures = moves.filter((m) => m.kind === 'capture');
  const builds = moves.filter((m) => m.kind === 'build' || m.kind === 'extendBuild' || m.kind === 'takeOverBuild');
  const trails = moves.filter((m) => m.kind === 'trail');

  if (difficulty === 'easy') {
    if (captures.length > 0) return captures[0];
    return trails[0] ?? moves[0];
  }

  const valueOfCapture = (m: CassinoMove) => {
    const capturedCards: Card[] = [];
    for (const id of m.targetIds) {
      const build = state.builds.find((b) => b.id === id);
      if (build) capturedCards.push(...build.cards);
      const tableCard = state.table.find((c) => `${c.suit}${c.rank}` === id);
      if (tableCard) capturedCards.push(tableCard);
    }
    return scoreValueOfCards(capturedCards);
  };

  if (difficulty === 'medium') {
    if (captures.length > 0) {
      return captures.reduce((best, m) => (valueOfCapture(m) > valueOfCapture(best) ? m : best));
    }
    const safeBuild = builds.find((m) => {
      // only build if no opponent could immediately capture with a stronger play — a
      // cheap heuristic: avoid builds worth exactly 10 (highest-demand capture value)
      return m.buildValue !== 10;
    });
    if (safeBuild) return safeBuild;
    return trails[0] ?? moves[0];
  }

  // hard: prefer highest-value capture; otherwise a build only when the value
  // is unlikely to be stolen (low card-count in play at that value), else trail.
  if (captures.length > 0) {
    return captures.reduce((best, m) => (valueOfCapture(m) > valueOfCapture(best) ? m : best));
  }
  if (builds.length > 0) {
    const rankedBuilds = [...builds].sort((a, b) => (a.buildValue ?? 0) - (b.buildValue ?? 0));
    return rankedBuilds[0];
  }
  return trails[0] ?? moves[0];
}
