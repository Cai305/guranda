import { CardsService } from './cards.service';
import { newFiveCardsGame, newMatch } from '@mxit2/types';

function makePrismaMock() {
  const cardGames = new Map<string, any>();
  let idCounter = 0;
  return {
    cardGame: {
      create: jest.fn(async ({ data }: any) => {
        const id = `game-${++idCounter}`;
        const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
        cardGames.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }: any) => cardGames.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const existing = cardGames.get(where.id);
        const updated = { ...existing, ...data };
        cardGames.set(where.id, updated);
        return updated;
      }),
    },
    cardGameMove: {
      create: jest.fn(async () => ({})),
    },
    cardGameStats: {
      upsert: jest.fn(async () => ({})),
    },
    cardRoom: {
      create: jest.fn(async ({ data }: any) => ({ id: 'room-1', roomCode: 'ABCD', ...data })),
      findUnique: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
    },
  };
}

describe('CardsService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: CardsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new CardsService(prisma as any);
  });

  describe('seatOf / aiSeatIndex', () => {
    it('finds a seat by userId and identifies the AI seat', () => {
      const game = { seats: [{ userId: 'u1', isAI: false }, { userId: null, isAI: true }] };
      expect(service.seatOf(game as any, 'u1')).toBe(0);
      expect(service.seatOf(game as any, 'nope')).toBeNull();
      expect(service.aiSeatIndex(game as any)).toBe(1);
    });
  });

  describe('sanitizeGameForSeat / sanitizeGameForSpectator', () => {
    it('redacts other seats hands for 5 Cards but keeps the requesting seat', () => {
      const state = newFiveCardsGame(
        [
          { userId: 'u1', isAI: false, displayName: 'A' },
          { userId: 'u2', isAI: false, displayName: 'B' },
        ],
        false,
      );
      const game = { mode: 'FIVE_CARDS', status: 'active', state };
      const sanitized = service.sanitizeGameForSeat(game, 0);
      expect(sanitized.state.seats[0].hand).toEqual(state.seats[0].hand);
      expect(sanitized.state.seats[1].hand.every((c: any) => c === null)).toBe(true);
    });

    it('redacts every hand for spectators, for both game modes', () => {
      const fiveCardsState = newFiveCardsGame(
        [
          { userId: 'u1', isAI: false, displayName: 'A' },
          { userId: 'u2', isAI: false, displayName: 'B' },
        ],
        false,
      );
      const cassinoState = newMatch(
        [
          { userId: 'u1', isAI: false, displayName: 'A' },
          { userId: 'u2', isAI: false, displayName: 'B' },
        ],
        'ONE_V_ONE',
        11,
      );
      const fcSanitized = service.sanitizeGameForSpectator({ mode: 'FIVE_CARDS', status: 'active', state: fiveCardsState });
      const cSanitized = service.sanitizeGameForSpectator({ mode: 'CASSINO', status: 'active', state: cassinoState });
      for (const seat of fcSanitized.state.seats) expect(seat.hand.every((c: any) => c === null)).toBe(true);
      for (const seat of cSanitized.state.seats) expect(seat.hand.every((c: any) => c === null)).toBe(true);
    });

    it('does not sanitize a finished game (full state is safe to reveal once over)', () => {
      const state = newFiveCardsGame(
        [
          { userId: 'u1', isAI: false, displayName: 'A' },
          { userId: 'u2', isAI: false, displayName: 'B' },
        ],
        false,
      );
      const game = { mode: 'FIVE_CARDS', status: 'finished', state };
      const sanitized = service.sanitizeGameForSeat(game, 0);
      expect(sanitized.state).toBe(state); // untouched, includes both hands
    });
  });

  describe('createFiveCardsGame / createCassinoGame', () => {
    it('persists a new 5 Cards game with seat metadata and authoritative state', async () => {
      const game = await service.createFiveCardsGame(
        [
          { userId: 'u1', displayName: 'A', isAI: false },
          { userId: null, displayName: 'Bot', isAI: true, difficulty: 'easy' },
        ],
        'u1',
        { jokersEnabled: true },
      );
      expect(game.mode).toBe('FIVE_CARDS');
      expect(game.seats).toHaveLength(2);
      expect(game.state.jokersEnabled).toBe(true);
      expect(prisma.cardGame.create).toHaveBeenCalledTimes(1);
    });

    it('persists a new Cassino game with the requested target score', async () => {
      const game = await service.createCassinoGame(
        [
          { userId: 'u1', displayName: 'A', isAI: false },
          { userId: 'u2', displayName: 'B', isAI: false },
        ],
        'u1',
        { targetScore: 21 },
      );
      expect(game.mode).toBe('CASSINO');
      expect(game.state.targetScore).toBe(21);
    });
  });

  describe('fiveCardsDraw / fiveCardsDiscard turn validation', () => {
    it('rejects a draw out of turn', async () => {
      const game = await service.createFiveCardsGame(
        [
          { userId: 'u1', displayName: 'A', isAI: false },
          { userId: 'u2', displayName: 'B', isAI: false },
        ],
        'u1',
      );
      const result: any = await service.fiveCardsDraw(game.id, 'u2');
      expect(result.error).toBe('Not your turn');
    });

    it('applies a valid draw and logs the move', async () => {
      const game = await service.createFiveCardsGame(
        [
          { userId: 'u1', displayName: 'A', isAI: false },
          { userId: 'u2', displayName: 'B', isAI: false },
        ],
        'u1',
      );
      const result: any = await service.fiveCardsDraw(game.id, 'u1');
      expect(result.error).toBeUndefined();
      expect(result.game.state.seats[0].hand).toHaveLength(6);
      expect(prisma.cardGameMove.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('rooms', () => {
    it('creates a room via the prisma client', async () => {
      const room = await service.createRoom('u1', 'FIVE_CARDS', false, 6, { jokersEnabled: false });
      expect(room.roomCode).toBe('ABCD');
      expect(prisma.cardRoom.create).toHaveBeenCalledTimes(1);
    });
  });
});
