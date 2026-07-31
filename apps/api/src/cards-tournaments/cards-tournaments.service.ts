import { Injectable, Inject, forwardRef, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CardsService, CardGameMode } from '../cards/cards.service';

interface Matchup {
  entryAId: string;
  entryBId: string | null; // null = a bye
  gameId?: string;
  winnerEntryId?: string;
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

@Injectable()
export class CardsTournamentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CardsService)) private cards: CardsService,
  ) {}

  async createTournament(
    createdById: string,
    mode: CardGameMode,
    name: string,
    maxPlayers: number,
    entryFee = 0,
    prizePool = 0,
  ) {
    return this.prisma.cardTournament.create({
      data: { createdById, mode, name, maxPlayers, entryFee, prizePool, status: 'registration' },
    });
  }

  async listOpen() {
    return this.prisma.cardTournament.findMany({
      where: { status: 'registration' },
      include: { entries: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTournament(id: string) {
    return this.prisma.cardTournament.findUnique({
      where: { id },
      include: { entries: { include: { user: { select: { id: true, username: true, profile: true } } } }, rounds: true },
    });
  }

  async register(tournamentId: string, userId: string) {
    const tournament = await this.prisma.cardTournament.findUnique({
      where: { id: tournamentId },
      include: { entries: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== 'registration') throw new BadRequestException('Registration is closed');
    if (tournament.entries.length >= tournament.maxPlayers) throw new BadRequestException('Tournament is full');
    if (tournament.entries.some((e) => e.userId === userId)) throw new BadRequestException('Already registered');

    if (tournament.entryFee > 0) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.balanceMasheleni) < tournament.entryFee) {
        throw new BadRequestException('Not enough MSH for the entry fee');
      }
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balanceMasheleni: { decrement: tournament.entryFee } },
        }),
        this.prisma.transaction.create({
          data: { walletId: wallet.id, type: 'PAYMENT', status: 'SUCCESS', amount: -tournament.entryFee },
        }),
      ]);
    }

    return this.prisma.cardTournamentEntry.create({ data: { tournamentId, userId } });
  }

  async startTournament(tournamentId: string, requesterId: string) {
    const tournament = await this.prisma.cardTournament.findUnique({
      where: { id: tournamentId },
      include: { entries: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.createdById !== requesterId) throw new BadRequestException('Only the organizer can start this tournament');
    if (tournament.status !== 'registration') throw new BadRequestException('Tournament already started');
    if (tournament.entries.length < 2) throw new BadRequestException('Need at least 2 players to start');

    await this.prisma.cardTournament.update({ where: { id: tournamentId }, data: { status: 'active' } });
    const entryIds = shuffled(tournament.entries.map((e) => e.id));
    await this.startRound(tournament, entryIds, 1);
    return this.getTournament(tournamentId);
  }

  private async startRound(tournament: { id: string; mode: CardGameMode; entryFee: number }, entryIds: string[], roundNumber: number) {
    const matchups: Matchup[] = [];
    for (let i = 0; i < entryIds.length; i += 2) {
      const entryAId = entryIds[i];
      const entryBId = entryIds[i + 1] ?? null;
      matchups.push({ entryAId, entryBId, winnerEntryId: entryBId === null ? entryAId : undefined });
    }

    const round = await this.prisma.cardTournamentRound.create({
      data: {
        tournamentId: tournament.id,
        roundNumber,
        matchups: matchups as any,
        status: matchups.every((m) => m.winnerEntryId) ? 'complete' : 'active',
      },
    });

    // Kick off a CardGame for every real (non-bye) matchup.
    const updatedMatchups: Matchup[] = [];
    for (let i = 0; i < matchups.length; i++) {
      const m = matchups[i];
      if (m.entryBId === null) {
        updatedMatchups.push(m);
        continue;
      }
      const entryA = await this.prisma.cardTournamentEntry.findUnique({ where: { id: m.entryAId }, include: { user: true } });
      const entryB = await this.prisma.cardTournamentEntry.findUnique({ where: { id: m.entryBId }, include: { user: true } });
      if (!entryA || !entryB) continue;
      const tournamentMatchId = `${round.id}:${i}`;
      const seats = [
        { userId: entryA.userId, displayName: entryA.user.username, isAI: false },
        { userId: entryB.userId, displayName: entryB.user.username, isAI: false },
      ];
      const game =
        tournament.mode === 'FIVE_CARDS'
          ? await this.cards.createFiveCardsGame(seats, entryA.userId, { tournamentMatchId })
          : await this.cards.createCassinoGame(seats, entryA.userId, { cassinoMode: 'ONE_V_ONE', tournamentMatchId });
      updatedMatchups.push({ ...m, gameId: game.id });
    }

    await this.prisma.cardTournamentRound.update({ where: { id: round.id }, data: { matchups: updatedMatchups as any } });

    // If every matchup in round 1 was a bye (degenerate case), advance immediately.
    if (updatedMatchups.every((m) => m.winnerEntryId)) {
      await this.finishRoundIfComplete(tournament as any, round.id);
    }
  }

  /** Called by CardsFinishHooksProvider when a finished CardGame carries a tournamentMatchId. */
  async advanceMatch(gameId: string) {
    const game = await this.prisma.cardGame.findUnique({ where: { id: gameId } });
    if (!game || !game.tournamentMatchId) return;
    const [roundId, indexStr] = game.tournamentMatchId.split(':');
    const index = Number(indexStr);
    const round = await this.prisma.cardTournamentRound.findUnique({ where: { id: roundId } });
    if (!round) return;
    const tournament = await this.prisma.cardTournament.findUnique({ where: { id: round.tournamentId } });
    if (!tournament) return;

    const matchups = round.matchups as unknown as Matchup[];
    const matchup = matchups[index];
    if (!matchup || matchup.winnerEntryId) return;

    const seats = game.seats as any[];
    const state = game.state as any;
    const winnerSeat: number | null = game.winnerSeat ?? state.winnerSeat ?? null;
    if (winnerSeat === null) return;
    const winnerUserId = seats[winnerSeat]?.userId;
    const entryA = await this.prisma.cardTournamentEntry.findUnique({ where: { id: matchup.entryAId } });
    const entryB = matchup.entryBId ? await this.prisma.cardTournamentEntry.findUnique({ where: { id: matchup.entryBId } }) : null;
    const winnerEntryId = entryA?.userId === winnerUserId ? matchup.entryAId : (entryB?.userId === winnerUserId ? matchup.entryBId! : null);
    if (!winnerEntryId) return;
    const loserEntryId = winnerEntryId === matchup.entryAId ? matchup.entryBId : matchup.entryAId;

    matchups[index] = { ...matchup, winnerEntryId };
    await this.prisma.cardTournamentRound.update({ where: { id: roundId }, data: { matchups: matchups as any } });
    if (loserEntryId) {
      await this.prisma.cardTournamentEntry.update({ where: { id: loserEntryId }, data: { eliminated: true } });
    }

    await this.finishRoundIfComplete(tournament, roundId);
  }

  private async finishRoundIfComplete(tournament: { id: string; mode: CardGameMode; entryFee: number; prizePool: number }, roundId: string) {
    const round = await this.prisma.cardTournamentRound.findUnique({ where: { id: roundId } });
    if (!round) return;
    const matchups = round.matchups as unknown as Matchup[];
    if (!matchups.every((m) => m.winnerEntryId)) return;

    await this.prisma.cardTournamentRound.update({ where: { id: roundId }, data: { status: 'complete' } });
    const winners = matchups.map((m) => m.winnerEntryId!);

    if (winners.length === 1) {
      await this.finishTournament(tournament, winners[0]);
      return;
    }
    await this.startRound(tournament, winners, round.roundNumber + 1);
  }

  private async finishTournament(tournament: { id: string; prizePool: number }, winnerEntryId: string) {
    await this.prisma.cardTournament.update({ where: { id: tournament.id }, data: { status: 'completed' } });
    await this.prisma.cardTournamentEntry.update({ where: { id: winnerEntryId }, data: { placement: 1 } });

    if (tournament.prizePool > 0) {
      const winnerEntry = await this.prisma.cardTournamentEntry.findUnique({ where: { id: winnerEntryId } });
      if (winnerEntry) {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId: winnerEntry.userId } });
        if (wallet) {
          await this.prisma.$transaction([
            this.prisma.wallet.update({
              where: { id: wallet.id },
              data: { balanceMasheleni: { increment: tournament.prizePool } },
            }),
            this.prisma.transaction.create({
              data: { walletId: wallet.id, type: 'RECEIVE', status: 'SUCCESS', amount: tournament.prizePool },
            }),
          ]);
        }
      }
    }
  }
}
