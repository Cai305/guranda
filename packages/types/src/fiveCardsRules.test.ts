import {
  Card,
  createDeck,
  newFiveCardsGame,
  drawFromDeck,
  takeDiscard,
  discard,
  detectWinningHand,
  possibleWinningSubsets,
  sanitizeFiveCardsStateForSeat,
  sanitizeFiveCardsStateForSpectator,
  pickAIDrawAction,
  pickAIDiscard,
} from './fiveCardsRules';

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}
function joker(suit: Card['suit'] = 'S'): Card {
  return { suit, rank: 0, isJoker: true };
}

describe('createDeck', () => {
  it('has 52 cards with no jokers', () => {
    const deck = createDeck(false);
    expect(deck).toHaveLength(52);
    expect(deck.some((card) => card.isJoker)).toBe(false);
  });

  it('has 54 cards with jokers enabled and no duplicates', () => {
    const deck = createDeck(true);
    expect(deck).toHaveLength(54);
    const keys = deck.map((card) => (card.isJoker ? `J${deck.indexOf(card)}` : `${card.suit}${card.rank}`));
    const nonJokerKeys = deck.filter((card) => !card.isJoker).map((card) => `${card.suit}${card.rank}`);
    expect(new Set(nonJokerKeys).size).toBe(52);
    expect(deck.filter((card) => card.isJoker)).toHaveLength(2);
  });
});

describe('newFiveCardsGame', () => {
  it('deals 5 cards to each seat and leaves one card face up on the discard pile', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
        { userId: null, isAI: true, displayName: 'Bot' },
      ],
      false,
    );
    expect(state.seats).toHaveLength(3);
    for (const seat of state.seats) expect(seat.hand).toHaveLength(5);
    expect(state.discardPile).toHaveLength(1);
    expect(state.deck).toHaveLength(52 - 3 * 5 - 1);
    expect(state.turnPhase).toBe('draw');
    expect(state.currentSeat).toBe(0);
  });
});

describe('detectWinningHand — straights', () => {
  it('recognizes A-2-3-4-5 as a straight (ace low)', () => {
    const hand = [c('S', 1), c('H', 2), c('D', 3), c('C', 4), c('S', 5)];
    expect(detectWinningHand(hand, false)).toEqual({ isWinner: true, type: 'straight' });
  });

  it('recognizes 5-6-7-8-9 as a straight', () => {
    const hand = [c('S', 5), c('H', 6), c('D', 7), c('C', 8), c('S', 9)];
    expect(detectWinningHand(hand, false)).toEqual({ isWinner: true, type: 'straight' });
  });

  it('recognizes 9-10-J-Q-K as the highest straight', () => {
    const hand = [c('S', 9), c('H', 10), c('D', 11), c('C', 12), c('S', 13)];
    expect(detectWinningHand(hand, false)).toEqual({ isWinner: true, type: 'straight' });
  });

  it('rejects a high-ace straight like 10-J-Q-K-A (ace is low only)', () => {
    const hand = [c('S', 10), c('H', 11), c('D', 12), c('C', 13), c('S', 1)];
    expect(detectWinningHand(hand, false).isWinner).toBe(false);
  });

  it('rejects a wraparound like Q-K-A-2-3', () => {
    const hand = [c('S', 12), c('H', 13), c('D', 1), c('C', 2), c('S', 3)];
    expect(detectWinningHand(hand, false).isWinner).toBe(false);
  });
});

describe('detectWinningHand — full house', () => {
  it('recognizes 1-1-2-2-2 (pair of aces + triple twos)', () => {
    const hand = [c('S', 1), c('H', 1), c('D', 2), c('C', 2), c('S', 2)];
    expect(detectWinningHand(hand, false)).toEqual({ isWinner: true, type: 'fullHouse' });
  });

  it('recognizes K-K-Q-Q-Q', () => {
    const hand = [c('S', 13), c('H', 13), c('D', 12), c('C', 12), c('S', 12)];
    expect(detectWinningHand(hand, false)).toEqual({ isWinner: true, type: 'fullHouse' });
  });

  it('rejects three distinct ranks (not a full house)', () => {
    const hand = [c('S', 1), c('H', 1), c('D', 2), c('C', 3), c('S', 3)];
    expect(detectWinningHand(hand, false).isWinner).toBe(false);
  });
});

describe('detectWinningHand — jokers', () => {
  it('a joker completes a straight when jokers are enabled', () => {
    const hand = [c('S', 1), c('H', 2), c('D', 3), c('C', 4), joker()];
    expect(detectWinningHand(hand, true)).toEqual({ isWinner: true, type: 'straight' });
  });

  it('a joker does not help when jokers are disabled', () => {
    const hand = [c('S', 1), c('H', 2), c('D', 3), c('C', 4), joker()];
    expect(detectWinningHand(hand, false).isWinner).toBe(false);
  });

  it('a joker completes a full house', () => {
    const hand = [c('S', 5), c('H', 5), c('D', 9), c('C', 9), joker()];
    expect(detectWinningHand(hand, true)).toEqual({ isWinner: true, type: 'fullHouse' });
  });
});

describe('turn/phase validation', () => {
  it('rejects drawing out of turn', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    const result = drawFromDeck(state, 1);
    expect(result.error).toBe('Not your turn');
  });

  it('rejects discarding before drawing', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    const result = discard(state, 0, state.seats[0].hand[0]);
    expect(result.error).toBe('Draw or take the discard first');
  });

  it('rejects drawing twice before discarding', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    const afterDraw = drawFromDeck(state, 0).state;
    const result = drawFromDeck(afterDraw, 0);
    expect(result.error).toBe('You must discard first');
  });

  it('draw then discard advances the turn to the next seat', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    const afterDraw = drawFromDeck(state, 0).state;
    expect(afterDraw.seats[0].hand).toHaveLength(6);
    const afterDiscard = discard(afterDraw, 0, afterDraw.seats[0].hand[0]).state;
    expect(afterDiscard.seats[0].hand).toHaveLength(5);
    expect(afterDiscard.currentSeat).toBe(1);
    expect(afterDiscard.turnPhase).toBe('draw');
  });

  it('taking the discard pile works the same as drawing', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    const afterTake = takeDiscard(state, 0);
    expect(afterTake.error).toBeUndefined();
    expect(afterTake.state.seats[0].hand).toHaveLength(6);
    expect(afterTake.state.discardPile).toHaveLength(0);
  });

  it('sets winnerSeat when a discard leaves a winning 5-card hand', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    state.turnPhase = 'discard';
    state.seats[0].hand = [c('S', 1), c('H', 2), c('D', 3), c('C', 4), c('S', 5), c('H', 13)];
    const result = discard(state, 0, c('H', 13));
    expect(result.state.winnerSeat).toBe(0);
  });
});

describe('possibleWinningSubsets', () => {
  it('finds the winning subset among 6 held cards', () => {
    const hand = [c('S', 1), c('H', 2), c('D', 3), c('C', 4), c('S', 5), c('H', 13)];
    const wins = possibleWinningSubsets(hand, false);
    expect(wins).toHaveLength(1);
    expect(wins[0]).toHaveLength(5);
  });

  it('returns no subsets when nothing wins', () => {
    const hand = [c('S', 1), c('H', 3), c('D', 6), c('C', 9), c('S', 11), c('H', 13)];
    expect(possibleWinningSubsets(hand, false)).toHaveLength(0);
  });
});

describe('sanitize — anti-cheat', () => {
  it('never leaks other seats hands, but keeps the requesting seat visible', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    const sanitized = sanitizeFiveCardsStateForSeat(state, 0);
    expect(sanitized.seats[0].hand).toEqual(state.seats[0].hand);
    expect(sanitized.seats[1].hand.every((card) => card === null)).toBe(true);
    expect(sanitized.deck).toHaveLength(0);
  });

  it('spectator view hides every seat hand', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: 'b', isAI: false, displayName: 'B' },
      ],
      false,
    );
    const sanitized = sanitizeFiveCardsStateForSpectator(state);
    for (const seat of sanitized.seats) {
      expect(seat.hand.every((card) => card === null)).toBe(true);
    }
  });
});

describe('AI', () => {
  it('easy difficulty always draws from the deck', () => {
    const state = newFiveCardsGame(
      [
        { userId: 'a', isAI: false, displayName: 'A' },
        { userId: null, isAI: true, displayName: 'Bot', difficulty: 'easy' },
      ],
      false,
    );
    expect(pickAIDrawAction(state, 1, 'easy')).toBe('draw');
  });

  it('pickAIDiscard chooses a card that keeps the hand closest to winning', () => {
    // Holding a near-straight (1,2,3,4) plus an unrelated 13 and a completing 5.
    const hand = [c('S', 1), c('H', 2), c('D', 3), c('C', 4), c('S', 13), c('H', 5)];
    const discarded = pickAIDiscard(hand, false);
    expect(discarded).toEqual(c('S', 13));
  });
});
