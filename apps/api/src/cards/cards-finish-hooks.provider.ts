import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { CardsService } from './cards.service';
import { AchievementsService } from '../achievements/achievements.service';
import { DailyChallengesService } from '../daily-challenges/daily-challenges.service';
import { ReferralsService } from '../referrals/referrals.service';
import { CardsTournamentsService } from '../cards-tournaments/cards-tournaments.service';

/**
 * Wires CardsService's onGameFinished extension point to the platform
 * features that need to react to a finished game (achievements, daily
 * challenges, referral payouts) — kept out of cards.service.ts itself so
 * that module doesn't need to know about every downstream feature.
 */
@Injectable()
export class CardsFinishHooksProvider implements OnModuleInit {
  constructor(
    private cards: CardsService,
    private achievements: AchievementsService,
    private dailyChallenges: DailyChallengesService,
    private referrals: ReferralsService,
    @Inject(forwardRef(() => CardsTournamentsService)) private tournaments: CardsTournamentsService,
  ) {}

  onModuleInit() {
    this.cards.onGameFinished = async (game: any) => {
      const seats = game.seats as any[];
      const state = game.state;
      const winnerSeat: number | null = game.winnerSeat ?? state.winnerSeat ?? null;
      const winnerTeam: number | null = game.winnerTeam ?? state.winnerTeam ?? null;

      for (const seat of seats) {
        if (!seat.userId) continue;
        const won =
          winnerSeat !== null
            ? seat.seatIndex === winnerSeat
            : winnerTeam !== null
              ? seat.team === winnerTeam
              : false;
        const sweeps = game.mode === 'CASSINO' ? (state.seats?.[seat.seatIndex]?.sweeps ?? 0) : 0;

        await this.achievements.evaluateForUser(seat.userId, game.mode);
        await this.dailyChallenges.recordEvent(seat.userId, { mode: game.mode, won, sweeps });
        if (game.wager > 0) {
          await this.referrals.rewardIfEligible(seat.userId);
        }
      }

      if (game.tournamentMatchId) {
        await this.tournaments.advanceMatch(game.id);
      }
    };
  }
}
