import {
  Card,
  CassinoState,
  newMatch,
  legalMoves,
  capture,
  build,
  extendOrTakeOverBuild,
  trail,
  detectSweep,
  scoreRound,
  cardValue,
  sanitizeCassinoStateForSeat,
  sanitizeCassinoStateForSpectator,
} from './cassinoRules';

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}

function baseState(overrides: Partial<CassinoState> = {}): CassinoState {
  const state = newMatch(
    [
      { userId: 'a', isAI: false, displayName: 'A' },
      { userId: 'b', isAI: false, displayName: 'B' },
    ],
    'ONE_V_ONE',
    11,
  );
  return { ...state, deck: [], builds: [], table: [], ...overrides };
}

describe('newMatch / dealRound', () => {
  it('deals 10 cards to each of 2 players and 4 to the table', () => {
    const state = newMatch(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      'ONE_V_ONE',
      11,
    );
    expect(state.seats[0].hand).toHaveLength(10);
    expect(state.seats[1].hand).toHaveLength(10);
    expect(state.table).toHaveLength(4);
    expect(state.deck).toHaveLength(52 - 20 - 4);
  });
});

describe('cardValue', () => {
  it('returns face value for ace-through-10', () => {
    expect(cardValue(c('S', 1))).toBe(1);
    expect(cardValue(c('S', 10))).toBe(10);
  });
  it('returns null for face cards (no numeric value)', () => {
    expect(cardValue(c('S', 11))).toBeNull();
    expect(cardValue(c('S', 12))).toBeNull();
    expect(cardValue(c('S', 13))).toBeNull();
  });
});

describe('legalMoves + capture', () => {
  it('finds a rank-match capture', () => {
    const state = baseState({
      table: [c('H', 7), c('D', 3)],
    });
    state.seats[0].hand = [c('S', 7)];
    const moves = legalMoves(state, 0);
    expect(moves.some((m) => m.kind === 'capture' && m.targetIds.includes('H7'))).toBe(true);
  });

  it('finds a sum-match capture over two loose numeric cards', () => {
    const state = baseState({ table: [c('H', 4), c('D', 3)] });
    state.seats[0].hand = [c('S', 7)];
    const moves = legalMoves(state, 0);
    const sumCapture = moves.find(
      (m) => m.kind === 'capture' && m.targetIds.length === 2 && m.targetIds.includes('H4') && m.targetIds.includes('D3'),
    );
    expect(sumCapture).toBeDefined();
  });

  it('applies a capture: removes cards from table, adds to capturedPile, advances turn', () => {
    const state = baseState({ table: [c('H', 7)] });
    state.seats[0].hand = [c('S', 7)];
    const result = capture(state, 0, c('S', 7), ['H7']);
    expect(result.error).toBeUndefined();
    expect(result.state.table).toHaveLength(0);
    expect(result.state.seats[0].capturedPile).toEqual(expect.arrayContaining([c('S', 7), c('H', 7)]));
    expect(result.state.currentSeat).toBe(1);
  });

  it('rejects an illegal capture', () => {
    const state = baseState({ table: [c('H', 9)] });
    state.seats[0].hand = [c('S', 7)];
    const result = capture(state, 0, c('S', 7), ['H9']);
    expect(result.error).toBe('Illegal capture');
  });

  it('rejects acting out of turn', () => {
    const state = baseState({ table: [c('H', 7)], currentSeat: 1 });
    state.seats[0].hand = [c('S', 7)];
    const result = capture(state, 0, c('S', 7), ['H7']);
    expect(result.error).toBe('Not your turn');
  });
});

describe('build + extend/take-over', () => {
  it('allows a build when the player holds a capturing card', () => {
    const state = baseState({ table: [c('H', 4)] });
    state.seats[0].hand = [c('S', 3), c('D', 7)]; // 3+4=7, holds a 7 to capture later
    const moves = legalMoves(state, 0);
    const buildMove = moves.find((m) => m.kind === 'build' && m.buildValue === 7);
    expect(buildMove).toBeDefined();
  });

  it('rejects a build when no capturing card is held', () => {
    const state = baseState({ table: [c('H', 4)] });
    state.seats[0].hand = [c('S', 3)]; // 3+4=7, nothing left to capture it with
    const moves = legalMoves(state, 0);
    expect(moves.some((m) => m.kind === 'build')).toBe(false);
  });

  it('creates a build that a later capture can pick up', () => {
    const state = baseState({ table: [c('H', 4)] });
    state.seats[0].hand = [c('S', 3), c('D', 7)];
    const built = build(state, 0, c('S', 3), ['H4'], 7);
    expect(built.error).toBeUndefined();
    expect(built.state.builds).toHaveLength(1);
    expect(built.state.builds[0].ownerSeat).toBe(0);
    expect(built.state.builds[0].value).toBe(7);
  });

  it('extending a build changes its value and owner', () => {
    const state = baseState({
      currentSeat: 1,
      builds: [{ id: 'b1', ownerSeat: 0, cards: [c('S', 3), c('H', 4)], value: 7 }],
    });
    state.seats[1].hand = [c('D', 2), c('C', 9)]; // 7+2=9, holds a 9
    const result = extendOrTakeOverBuild(state, 1, 'b1', c('D', 2), 9);
    expect(result.error).toBeUndefined();
    expect(result.state.builds[0].value).toBe(9);
    expect(result.state.builds[0].ownerSeat).toBe(1);
  });
});

describe('trail', () => {
  it('moves a hand card to the table and advances the turn', () => {
    const state = baseState();
    state.seats[0].hand = [c('S', 2)];
    const result = trail(state, 0, c('S', 2));
    expect(result.error).toBeUndefined();
    expect(result.state.table).toEqual([c('S', 2)]);
    expect(result.state.currentSeat).toBe(1);
  });
});

describe('detectSweep', () => {
  it('is true only when the table+builds went from non-empty to empty', () => {
    expect(detectSweep(3, 0)).toBe(true);
    expect(detectSweep(0, 0)).toBe(false);
    expect(detectSweep(3, 1)).toBe(false);
  });
});

describe('scoreRound — 11-point SA scoring', () => {
  it('awards 1 point per ace, up to 4', () => {
    const state = baseState();
    state.seats[0].capturedPile = [c('S', 1), c('H', 1), c('D', 1), c('C', 1)];
    const results = scoreRound(state);
    const seat0 = results.find((r) => r.seatIndexes.includes(0))!;
    expect(seat0.breakdown.aces).toBe(4);
  });

  it('awards 1 point for 2 of spades and 1 for 5 of spades', () => {
    const state = baseState();
    state.seats[0].capturedPile = [c('S', 2), c('S', 5)];
    const results = scoreRound(state);
    const seat0 = results.find((r) => r.seatIndexes.includes(0))!;
    expect(seat0.breakdown.twoSpades).toBe(1);
    expect(seat0.breakdown.fiveSpades).toBe(1);
  });

  it('awards 2 points for 10 of diamonds', () => {
    const state = baseState();
    state.seats[0].capturedPile = [c('D', 10)];
    const results = scoreRound(state);
    const seat0 = results.find((r) => r.seatIndexes.includes(0))!;
    expect(seat0.breakdown.tenDiamonds).toBe(2);
  });

  it('awards most-spades and most-cards to the seat with more of each', () => {
    const state = baseState();
    state.seats[0].capturedPile = [c('S', 3), c('S', 4), c('S', 6), c('H', 9)];
    state.seats[1].capturedPile = [c('D', 8)];
    const results = scoreRound(state);
    const seat0 = results.find((r) => r.seatIndexes.includes(0))!;
    const seat1 = results.find((r) => r.seatIndexes.includes(1))!;
    expect(seat0.breakdown.mostSpades).toBe(1);
    expect(seat0.breakdown.mostCards).toBe(0); // only 4 cards, no most-cards bonus below 20
    expect(seat1.breakdown.mostSpades).toBe(0);
  });

  it('splits the most-spades point on a tie', () => {
    const state = baseState();
    state.seats[0].capturedPile = [c('S', 3)];
    state.seats[1].capturedPile = [c('S', 4)];
    const results = scoreRound(state);
    const seat0 = results.find((r) => r.seatIndexes.includes(0))!;
    const seat1 = results.find((r) => r.seatIndexes.includes(1))!;
    expect(seat0.breakdown.mostSpades).toBe(0.5);
    expect(seat1.breakdown.mostSpades).toBe(0.5);
  });

  it('awards 1 point for exactly 20 cards, 2 points for more than 20', () => {
    const twentyCards = Array.from({ length: 20 }, (_, i) => c('H', (i % 10) + 1));
    const state1 = baseState();
    state1.seats[0].capturedPile = twentyCards;
    state1.seats[1].capturedPile = Array.from({ length: 12 }, (_, i) => c('D', (i % 10) + 1));
    const r1 = scoreRound(state1);
    expect(r1.find((r) => r.seatIndexes.includes(0))!.breakdown.mostCards).toBe(1);

    const twentyOneCards = Array.from({ length: 21 }, (_, i) => c('H', (i % 10) + 1));
    const state2 = baseState();
    state2.seats[0].capturedPile = twentyOneCards;
    state2.seats[1].capturedPile = Array.from({ length: 11 }, (_, i) => c('D', (i % 10) + 1));
    const r2 = scoreRound(state2);
    expect(r2.find((r) => r.seatIndexes.includes(0))!.breakdown.mostCards).toBe(2);
  });

  it('total points across all seats sum to 11 when there are no ties', () => {
    const state = baseState();
    state.seats[0].capturedPile = [
      c('S', 1),
      c('H', 1),
      c('D', 1),
      c('S', 2),
      c('S', 5),
      c('D', 10),
      ...Array.from({ length: 15 }, (_, i) => c('C', (i % 9) + 3)),
    ];
    state.seats[1].capturedPile = [c('C', 1), c('D', 3)];
    const results = scoreRound(state);
    const total = results.reduce((acc, r) => acc + r.points, 0);
    expect(total).toBe(11);
  });
});

describe('sanitize — anti-cheat', () => {
  it('hides opponent hands but keeps the requesting seat visible', () => {
    const state = newMatch(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      'ONE_V_ONE',
      11,
    );
    const sanitized = sanitizeCassinoStateForSeat(state, 0);
    expect(sanitized.seats[0].hand).toEqual(state.seats[0].hand);
    expect(sanitized.seats[1].hand.every((card) => card === null)).toBe(true);
  });

  it('spectator view hides every hand', () => {
    const state = newMatch(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      'ONE_V_ONE',
      11,
    );
    const sanitized = sanitizeCassinoStateForSpectator(state);
    for (const seat of sanitized.seats) {
      expect(seat.hand.every((card) => card === null)).toBe(true);
    }
  });
});
