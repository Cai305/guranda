// ============================================================
// 5 Cards (South African version) — pure rules engine, shared by
// the NestJS server (authoritative online play) and the mobile
// client (offline/local AI play + board rendering).
//
// 2+ players, standard 52-card deck + optional jokers. Each player
// holds 5 cards; on a turn they draw from the deck OR take the top
// of the discard pile (now holding 6), then must discard 1 card
// back down to 5. Objective: hold a winning 5-card combination —
// a straight (ace LOW only, e.g. A-2-3-4-5 through 9-10-J-Q-K) or a
// full house (one triple + one pair).
// ============================================================

export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  suit: Suit;
  rank: number; // 1 (ace) - 13 (king); ignored (0) for jokers
  isJoker?: boolean;
}

export type FiveCardsDifficulty = 'easy' | 'medium' | 'hard';

export interface FiveCardsSeat {
  seatIndex: number;
  userId: string | null;
  isAI: boolean;
  displayName: string;
  difficulty?: FiveCardsDifficulty;
  hand: Card[];
}

export interface FiveCardsState {
  deck: Card[]; // face-down draw pile; index 0 = top
  discardPile: Card[]; // index 0 = top (most recently discarded)
  seats: FiveCardsSeat[];
  currentSeat: number;
  jokersEnabled: boolean;
  turnPhase: 'draw' | 'discard';
  winnerSeat: number | null;
  turnStartedAt: number; // ms epoch — server enforces the turn timer from this
}

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDeck(jokersEnabled: boolean): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  }
  if (jokersEnabled) {
    deck.push({ suit: 'S', rank: 0, isJoker: true });
    deck.push({ suit: 'H', rank: 0, isJoker: true });
  }
  return shuffled(deck);
}

export interface FiveCardsSeatInput {
  userId: string | null;
  isAI: boolean;
  displayName: string;
  difficulty?: FiveCardsDifficulty;
}

export function newFiveCardsGame(
  seatInputs: FiveCardsSeatInput[],
  jokersEnabled: boolean,
): FiveCardsState {
  const deck = createDeck(jokersEnabled);
  const seats: FiveCardsSeat[] = seatInputs.map((s, seatIndex) => ({
    seatIndex,
    userId: s.userId,
    isAI: s.isAI,
    displayName: s.displayName,
    difficulty: s.difficulty,
    hand: [],
  }));
  for (const seat of seats) {
    seat.hand = deck.splice(0, 5);
  }
  const discardPile = deck.splice(0, 1);
  return {
    deck,
    discardPile,
    seats,
    currentSeat: 0,
    jokersEnabled,
    turnPhase: 'draw',
    winnerSeat: null,
    turnStartedAt: Date.now(),
  };
}

function cloneState(state: FiveCardsState): FiveCardsState {
  return {
    ...state,
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    seats: state.seats.map((s) => ({ ...s, hand: [...s.hand] })),
  };
}

export function drawFromDeck(
  state: FiveCardsState,
  seatIndex: number,
): { state: FiveCardsState; error?: string } {
  if (state.winnerSeat !== null) return { state, error: 'Game is finished' };
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };
  if (state.turnPhase !== 'draw') return { state, error: 'You must discard first' };

  const next = cloneState(state);
  if (next.deck.length === 0) {
    // Reshuffle the discard pile (keeping its top card in play) back into the deck.
    const top = next.discardPile.shift();
    next.deck = shuffled(next.discardPile);
    next.discardPile = top ? [top] : [];
  }
  const card = next.deck.shift();
  if (!card) return { state, error: 'No cards left to draw' };
  next.seats[seatIndex].hand.push(card);
  next.turnPhase = 'discard';
  return { state: next };
}

export function takeDiscard(
  state: FiveCardsState,
  seatIndex: number,
): { state: FiveCardsState; error?: string } {
  if (state.winnerSeat !== null) return { state, error: 'Game is finished' };
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };
  if (state.turnPhase !== 'draw') return { state, error: 'You must discard first' };
  if (state.discardPile.length === 0) return { state, error: 'Discard pile is empty' };

  const next = cloneState(state);
  const card = next.discardPile.shift()!;
  next.seats[seatIndex].hand.push(card);
  next.turnPhase = 'discard';
  return { state: next };
}

function cardKey(c: Card): string {
  return c.isJoker ? `J${c.suit}` : `${c.suit}${c.rank}`;
}

export function discard(
  state: FiveCardsState,
  seatIndex: number,
  card: Card,
): { state: FiveCardsState; error?: string } {
  if (state.winnerSeat !== null) return { state, error: 'Game is finished' };
  if (state.currentSeat !== seatIndex) return { state, error: 'Not your turn' };
  if (state.turnPhase !== 'discard') return { state, error: 'Draw or take the discard first' };

  const seat = state.seats[seatIndex];
  const idx = seat.hand.findIndex((c) => cardKey(c) === cardKey(card));
  if (idx === -1) return { state, error: 'That card is not in your hand' };

  const next = cloneState(state);
  const [removed] = next.seats[seatIndex].hand.splice(idx, 1);
  next.discardPile.unshift(removed);

  const result = detectWinningHand(next.seats[seatIndex].hand, next.jokersEnabled);
  if (result.isWinner) {
    next.winnerSeat = seatIndex;
    return { state: next };
  }

  next.turnPhase = 'draw';
  next.currentSeat = (seatIndex + 1) % next.seats.length;
  next.turnStartedAt = Date.now();
  return { state: next };
}

// ---- Winning-hand detection ----

const STRAIGHT_WINDOWS: number[][] = Array.from({ length: 9 }, (_, i) => [
  i + 1,
  i + 2,
  i + 3,
  i + 4,
  i + 5,
]); // ace-low only: [1..5] through [9..13], no wraparound, no high ace

export function detectWinningHand(
  hand: Card[],
  jokersEnabled: boolean,
): { isWinner: boolean; type: 'straight' | 'fullHouse' | null } {
  if (hand.length !== 5) return { isWinner: false, type: null };

  const jokerCount = jokersEnabled ? hand.filter((c) => c.isJoker).length : 0;
  const realRanks = hand.filter((c) => !c.isJoker).map((c) => c.rank);

  if (isStraightWithJokers(realRanks, jokerCount)) {
    return { isWinner: true, type: 'straight' };
  }
  if (isFullHouseWithJokers(realRanks, jokerCount)) {
    return { isWinner: true, type: 'fullHouse' };
  }
  return { isWinner: false, type: null };
}

function isStraightWithJokers(realRanks: number[], jokerCount: number): boolean {
  const set = new Set(realRanks);
  if (set.size !== realRanks.length) return false; // duplicate real rank can never be part of a straight
  for (const window of STRAIGHT_WINDOWS) {
    const missing = window.filter((r) => !set.has(r)).length;
    const extra = realRanks.filter((r) => !window.includes(r)).length;
    if (extra === 0 && missing <= jokerCount) return true;
  }
  return false;
}

function isFullHouseWithJokers(realRanks: number[], jokerCount: number): boolean {
  const counts = new Map<number, number>();
  for (const r of realRanks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const distinctRanks = [...counts.keys()];
  if (distinctRanks.length > 2) return false; // a 3rd distinct rank can never fit a full house

  // Try every ordered pair of (tripleRank, pairRank) drawn from ranks present
  // in hand, or a brand-new rank entirely filled by jokers.
  const candidates = distinctRanks.length > 0 ? distinctRanks : [1];
  for (const tripleRank of [...candidates, -1]) {
    for (const pairRank of [...candidates, -1]) {
      if (tripleRank === pairRank) continue;
      const haveTriple = tripleRank === -1 ? 0 : (counts.get(tripleRank) ?? 0);
      const havePair = pairRank === -1 ? 0 : (counts.get(pairRank) ?? 0);
      // every real card must belong to one of the two chosen ranks
      const accounted = distinctRanks.every((r) => r === tripleRank || r === pairRank);
      if (!accounted) continue;
      const needed = Math.max(0, 3 - haveTriple) + Math.max(0, 2 - havePair);
      if (needed <= jokerCount) return true;
    }
  }
  return false;
}

/**
 * Given a 6-card hand (post-draw, pre-discard), returns every winning 5-card
 * subset reachable by discarding exactly one card. Powers "highlight
 * possible winning hands" and auto-win detection.
 */
export function possibleWinningSubsets(hand: Card[], jokersEnabled: boolean): Card[][] {
  const wins: Card[][] = [];
  for (let i = 0; i < hand.length; i++) {
    const subset = hand.slice(0, i).concat(hand.slice(i + 1));
    if (subset.length === 5 && detectWinningHand(subset, jokersEnabled).isWinner) {
      wins.push(subset);
    }
  }
  return wins;
}

/** Heuristic (not exact) "how many card swaps from a win" — used by AI. */
export function nearestWinDistance(hand: Card[], jokersEnabled: boolean): number {
  if (hand.length !== 5) return 5;
  const jokerCount = jokersEnabled ? hand.filter((c) => c.isJoker).length : 0;
  const realRanks = hand.filter((c) => !c.isJoker).map((c) => c.rank);
  return Math.min(
    straightDistance(realRanks, jokerCount),
    fullHouseDistance(realRanks, jokerCount),
  );
}

function straightDistance(realRanks: number[], jokerCount: number): number {
  const set = new Set(realRanks);
  let best = 5;
  for (const window of STRAIGHT_WINDOWS) {
    const missing = window.filter((r) => !set.has(r)).length;
    const extra = realRanks.filter((r) => !window.includes(r)).length;
    const distance = Math.max(0, missing - jokerCount) + extra;
    if (distance < best) best = distance;
  }
  return best;
}

function fullHouseDistance(realRanks: number[], jokerCount: number): number {
  const counts = new Map<number, number>();
  for (const r of realRanks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const sorted = [...counts.values()].sort((a, b) => b - a);
  const top1 = sorted[0] ?? 0;
  const top2 = sorted[1] ?? 0;
  const extraRanks = Math.max(0, sorted.length - 2);
  const deficit = Math.max(0, 3 - top1) + Math.max(0, 2 - top2);
  return Math.max(0, deficit - jokerCount) + extraRanks;
}

// ---- Anti-cheat: redact hidden information before broadcasting ----

export function sanitizeFiveCardsStateForSeat(
  state: FiveCardsState,
  seatIndex: number,
): FiveCardsState {
  return {
    ...state,
    deck: [], // order/contents of the face-down pile are never revealed
    seats: state.seats.map((s) =>
      s.seatIndex === seatIndex
        ? { ...s, hand: [...s.hand] }
        : { ...s, hand: new Array(s.hand.length).fill(null) as unknown as Card[] },
    ),
  };
}

export function sanitizeFiveCardsStateForSpectator(state: FiveCardsState): FiveCardsState {
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
//
// Two-step by design: the gateway calls pickAIDrawAction() first (draw vs.
// take-discard is decided from the 5-card hand + visible discard top —
// the drawn card itself is unknown until the draw actually resolves), then
// applies drawFromDeck/takeDiscard, then calls pickAIDiscard() on the real
// resulting 6-card hand to choose what to discard.

export function pickAIDrawAction(
  state: FiveCardsState,
  seatIndex: number,
  difficulty: FiveCardsDifficulty,
): 'draw' | 'takeDiscard' {
  if (difficulty === 'easy') return 'draw'; // Easy never reads the discard pile

  const seat = state.seats[seatIndex];
  const topDiscard = state.discardPile[0];
  if (!topDiscard) return 'draw';

  const currentDistance = nearestWinDistance(seat.hand, state.jokersEnabled);
  const withDiscard = [...seat.hand, topDiscard];
  const bestAfterTaking = pickAIDiscard(withDiscard, state.jokersEnabled);
  const distanceAfterTaking = nearestWinDistance(
    withDiscard.filter((c) => cardKey(c) !== cardKey(bestAfterTaking)),
    state.jokersEnabled,
  );
  return distanceAfterTaking < currentDistance ? 'takeDiscard' : 'draw';
}

/** Once the 6th card (from deck or discard) is known, pick the best discard. */
export function pickAIDiscard(hand: Card[], jokersEnabled: boolean): Card {
  let bestCard = hand[0];
  let bestDistance = Infinity;
  for (let i = 0; i < hand.length; i++) {
    const remaining = hand.slice(0, i).concat(hand.slice(i + 1));
    const distance = nearestWinDistance(remaining, jokersEnabled);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCard = hand[i];
    }
  }
  return bestCard;
}
