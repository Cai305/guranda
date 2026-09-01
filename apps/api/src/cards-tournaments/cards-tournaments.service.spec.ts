import { CardsTournamentsService } from './cards-tournaments.service';

interface FakeDb {
  tournaments: Map<string, any>;
  entries: Map<string, any>;
  rounds: Map<string, any>;
  games: Map<string, any>;
  users: Map<string, any>;
}

function makePrismaMock(db: FakeDb) {
  let roundCounter = 0;
  let entryCounter = 0;
  let tournamentCounter = 0;

  return {
    cardTournament: {
      create: jest.fn(async ({ data }: any) => {
        const id = `t${++tournamentCounter}`;
        const record = { id, entries: [], rounds: [], createdAt: new Date(), updatedAt: new Date(), ...data };
        db.tournaments.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where, include }: any) => {
        const t = db.tournaments.get(where.id);
        if (!t) return null;
        if (include?.entries) {
          return { ...t, entries: [...db.entries.values()].filter((e) => e.tournamentId === where.id) };
        }
        return t;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const t = db.tournaments.get(where.id);
        const updated = { ...t, ...data };
        db.tournaments.set(where.id, updated);
        return updated;
      }),
    },
    cardTournamentEntry: {
      create: jest.fn(async ({ data }: any) => {
        const id = `e${++entryCounter}`;
        const record = { id, eliminated: false, placement: null, joinedAt: new Date(), ...data };
        db.entries.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const entry = db.entries.get(where.id);
        if (!entry) return null;
        return { ...entry, user: db.users.get(entry.userId) };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const updated = { ...db.entries.get(where.id), ...data };
        db.entries.set(where.id, updated);
        return updated;
      }),
    },
    cardTournamentRound: {
      create: jest.fn(async ({ data }: any) => {
        const id = `r${++roundCounter}`;
        const record = { id, createdAt: new Date(), ...data };
        db.rounds.set(id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }: any) => db.rounds.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const updated = { ...db.rounds.get(where.id), ...data };
        db.rounds.set(where.id, updated);
        return updated;
      }),
    },
    cardGame: {
      findUnique: jest.fn(async ({ where }: any) => db.games.get(where.id) ?? null),
    },
    wallet: {
      findUnique: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
    },
    transaction: {
      create: jest.fn(async () => ({})),
    },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
}

function makeCardsMock(db: FakeDb) {
  let gameCounter = 0;
  const createGame = jest.fn(async (seats: any[], _createdById: string, options: any) => {
    const id = `g${++gameCounter}`;
    const game = {
      id,
      tournamentMatchId: options.tournamentMatchId,
      seats: seats.map((s, i) => ({ seatIndex: i, userId: s.userId, isAI: false, displayName: s.displayName })),
      status: 'active',
      winnerSeat: null,
      state: { winnerSeat: null },
    };
    db.games.set(id, game);
    return game;
  });
  return { createFiveCardsGame: createGame, createCassinoGame: createGame };
}

/** Marks a matchup's CardGame as finished with the given seat winning, for the test to then call advanceMatch. */
function finishGame(db: FakeDb, gameId: string, winnerSeat: number) {
  const game = db.games.get(gameId);
  db.games.set(gameId, { ...game, status: 'finished', winnerSeat, state: { ...game.state, winnerSeat } });
}

describe('CardsTournamentsService — bracket engine', () => {
  let db: FakeDb;
  let prisma: ReturnType<typeof makePrismaMock>;
  let cards: ReturnType<typeof makeCardsMock>;
  let service: CardsTournamentsService;

  beforeEach(() => {
    db = { tournaments: new Map(), entries: new Map(), rounds: new Map(), games: new Map(), users: new Map() };
    for (let i = 1; i <= 4; i++) db.users.set(`u${i}`, { id: `u${i}`, username: `player${i}` });
    prisma = makePrismaMock(db);
    cards = makeCardsMock(db);
    const notifications = { create: jest.fn(async () => ({})) };
    service = new CardsTournamentsService(prisma as any, cards as any, notifications as any);
  });

  it('gives a bye when the field has an odd number of entries', async () => {
    const tournament = await service.createTournament('u1', 'FIVE_CARDS', 'Odd Cup', 8);
    await service.register(tournament.id, 'u1');
    await service.register(tournament.id, 'u2');
    await service.register(tournament.id, 'u3');

    await service.startTournament(tournament.id, 'u1');

    const rounds = [...db.rounds.values()].filter((r) => r.tournamentId === tournament.id);
    expect(rounds).toHaveLength(1);
    const matchups = rounds[0].matchups;
    expect(matchups).toHaveLength(2);
    const byeMatchup = matchups.find((m: any) => m.entryBId === null);
    const realMatchup = matchups.find((m: any) => m.entryBId !== null);
    expect(byeMatchup.winnerEntryId).toBe(byeMatchup.entryAId); // bye auto-advances
    expect(realMatchup.winnerEntryId).toBeUndefined(); // needs its game played out
    expect(realMatchup.gameId).toBeDefined();
    expect(rounds[0].status).toBe('active'); // not complete — the real matchup is still pending
  });

  it('advances a 4-player bracket through 2 rounds to a single champion', async () => {
    const tournament = await service.createTournament('u1', 'FIVE_CARDS', 'Cup of Four', 8);
    for (const u of ['u1', 'u2', 'u3', 'u4']) await service.register(tournament.id, u);
    await service.startTournament(tournament.id, 'u1');

    const round1 = [...db.rounds.values()].find((r) => r.tournamentId === tournament.id && r.roundNumber === 1);
    expect(round1.matchups).toHaveLength(2);
    expect(round1.matchups.every((m: any) => m.gameId)).toBe(true); // 4 entries, no byes

    // Play out both round-1 matchups — seat 0 wins each.
    for (const matchup of round1.matchups) {
      finishGame(db, matchup.gameId, 0);
      await service.advanceMatch(matchup.gameId);
    }

    const finishedRound1 = await prisma.cardTournamentRound.findUnique({ where: { id: round1.id } });
    expect(finishedRound1.status).toBe('complete');

    const round2 = [...db.rounds.values()].find((r) => r.tournamentId === tournament.id && r.roundNumber === 2);
    expect(round2).toBeDefined();
    expect(round2.matchups).toHaveLength(1);

    // Play out the final.
    finishGame(db, round2.matchups[0].gameId, 0);
    await service.advanceMatch(round2.matchups[0].gameId);

    const finishedTournament = await prisma.cardTournament.findUnique({ where: { id: tournament.id } });
    expect(finishedTournament.status).toBe('completed');

    const winnerEntry = await prisma.cardTournamentEntry.findUnique({ where: { id: round2.matchups[0].entryAId } });
    expect(winnerEntry.placement).toBe(1);
  });

  it('eliminates the loser of a matchup', async () => {
    const tournament = await service.createTournament('u1', 'FIVE_CARDS', 'Duel', 8);
    await service.register(tournament.id, 'u1');
    await service.register(tournament.id, 'u2');
    await service.startTournament(tournament.id, 'u1');

    const round1 = [...db.rounds.values()].find((r) => r.tournamentId === tournament.id);
    const matchup = round1.matchups[0];
    finishGame(db, matchup.gameId, 0); // entryA (seat 0) wins
    await service.advanceMatch(matchup.gameId);

    const loserEntry = await prisma.cardTournamentEntry.findUnique({ where: { id: matchup.entryBId } });
    expect(loserEntry.eliminated).toBe(true);
  });

  it('rejects starting a tournament with fewer than 2 registered entries', async () => {
    const tournament = await service.createTournament('u1', 'FIVE_CARDS', 'Lonely Cup', 8);
    await service.register(tournament.id, 'u1');
    await expect(service.startTournament(tournament.id, 'u1')).rejects.toThrow('Need at least 2 players');
  });

  it('only the organizer can start the tournament', async () => {
    const tournament = await service.createTournament('u1', 'FIVE_CARDS', 'Cup', 8);
    await service.register(tournament.id, 'u1');
    await service.register(tournament.id, 'u2');
    await expect(service.startTournament(tournament.id, 'u2')).rejects.toThrow('Only the organizer');
  });
});
