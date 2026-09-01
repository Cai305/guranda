import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BadgeService } from '../profile/badge.service';
import { NotificationsService } from '../notifications/notifications.service';

const PAYOUT_MODES = ['COMPLETION', 'PER_MINUTE', 'WATCH_AND_SUBSCRIBE'] as const;
export type VideoRewardPayoutMode = (typeof PAYOUT_MODES)[number];

// A viewer is considered to have "completed" a video at 95%, not literally
// 100% — progress heartbeats are ~10s-granular (see video.service.ts's
// updateWatchProgress), so requiring exact completion would make COMPLETION
// and WATCH_AND_SUBSCRIBE payouts miss almost every real viewer who watched
// the whole thing but stopped heartbeating a few seconds before the end.
const COMPLETION_THRESHOLD = 0.95;

// One badge per video type, minted the first time a viewer earns ANY payout
// from a video of that type. Uncapped (matches BadgeService.mintUncapped) —
// this is meant to recognize repeat participation in a content category, not
// scarce collectible status. Seeded into BadgeService.SEED_BADGES.
const VIDEO_TYPE_BADGE_CODE: Record<string, string> = {
  SPONSORED: 'SPONSORED_VIEWER',
  PROMO: 'PROMO_VIEWER',
  CAMPAIGN: 'CAMPAIGN_VIEWER',
  ADVERT: 'ADVERT_VIEWER',
  MUSIC: 'MUSIC_LISTENER',
};

@Injectable()
export class VideoRewardService {
  constructor(
    private prisma: PrismaService,
    private badges: BadgeService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Creator/advertiser funds a video's watch-to-earn budget from their own
   * wallet, debited immediately — real spend behind it, never free money
   * creation. One reward config per video (schema-enforced @@unique).
   */
  async fundReward(
    videoId: string,
    creatorId: string,
    payoutMode: string,
    amountPerUnit: number,
    totalBudgetMsh: number,
  ) {
    if (!PAYOUT_MODES.includes(payoutMode as VideoRewardPayoutMode)) {
      throw new BadRequestException(`payoutMode must be one of ${PAYOUT_MODES.join(', ')}`);
    }
    if (!(amountPerUnit > 0) || !(totalBudgetMsh > 0)) {
      throw new BadRequestException('amountPerUnit and totalBudgetMsh must both be positive');
    }

    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.creatorId !== creatorId) {
      throw new ForbiddenException('Only the video\'s creator can fund a reward for it');
    }

    const existing = await this.prisma.videoReward.findUnique({ where: { videoId } });
    if (existing) {
      throw new BadRequestException('This video already has a reward configured');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: creatorId } });
      if (!wallet || Number(wallet.balanceMasheleni) < totalBudgetMsh) {
        throw new BadRequestException('Not enough MSH balance to fund this reward budget');
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { decrement: totalBudgetMsh } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'VIDEO_REWARD_FUND',
          status: 'SUCCESS',
          amount: -totalBudgetMsh,
        },
      });
      return tx.videoReward.create({
        data: {
          videoId,
          payoutMode,
          amountPerUnit,
          totalBudgetMsh,
          remainingBudgetMsh: totalBudgetMsh,
        },
      });
    });
  }

  /**
   * Called from video.service.ts's updateWatchProgress on every real
   * playback heartbeat (~10s cadence, server-trusted — never a client-side
   * "mark complete" call). No-ops instantly (one indexed lookup) for the
   * overwhelming majority of videos, which have no reward configured.
   *
   * Computes the viewer's current entitlement for this heartbeat, compares
   * it against what's already been recorded in their VideoRewardClaim
   * ledger row, and pays only the delta — so this is safe to call
   * repeatedly with the same or growing `watchedSeconds` and never
   * double-pays. Rewatching after already being paid pays nothing further:
   * the ledger row's recorded amount is a ceiling this function only ever
   * raises, matching the @@unique([videoRewardId, userId]) constraint's
   * "once per viewer per video, ever" guarantee.
   */
  async processHeartbeat(videoId: string, userId: string, watchedSeconds: number): Promise<void> {
    const reward = await this.prisma.videoReward.findUnique({ where: { videoId } });
    if (!reward || reward.remainingBudgetMsh <= 0) return;
    if (watchedSeconds < reward.minWatchSeconds) return;

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { duration: true, creatorId: true, videoType: true },
    });
    if (!video || video.duration <= 0) return;

    const entitlement = await this.computeEntitlement(reward, userId, video, watchedSeconds);
    if (entitlement === null) return;

    const claim = await this.prisma.videoRewardClaim.upsert({
      where: { videoRewardId_userId: { videoRewardId: reward.id, userId } },
      update: {},
      create: { videoRewardId: reward.id, userId },
    });

    const alreadyPaid = claim.amountPaid;
    const owed = Math.max(0, entitlement - alreadyPaid);
    if (owed <= 0) {
      // Still worth recording newer watchedSeconds even with nothing new
      // owed (e.g. PER_MINUTE between minute boundaries), so a later
      // heartbeat's delta calculation has an accurate floor to compare from.
      if (watchedSeconds > claim.watchedSeconds) {
        await this.prisma.videoRewardClaim.update({
          where: { id: claim.id },
          data: { watchedSeconds },
        });
      }
      return;
    }

    // Never pay more than remains in the video's funded budget — the last
    // viewer to cross the line on a nearly-exhausted budget gets whatever's
    // left, not the full computed entitlement.
    const payout = Math.min(owed, reward.remainingBudgetMsh);
    if (payout <= 0) return;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return;

    const isFirstPayout = alreadyPaid === 0;

    await this.prisma.$transaction([
      this.prisma.videoReward.update({
        where: { id: reward.id },
        data: { remainingBudgetMsh: { decrement: payout } },
      }),
      this.prisma.videoRewardClaim.update({
        where: { id: claim.id },
        data: { amountPaid: { increment: payout }, watchedSeconds, badgeMinted: isFirstPayout || claim.badgeMinted },
      }),
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { increment: payout } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'VIDEO_REWARD_PAYOUT',
          status: 'SUCCESS',
          amount: payout,
        },
      }),
    ]);

    if (isFirstPayout) {
      const badgeCode = VIDEO_TYPE_BADGE_CODE[video.videoType];
      if (badgeCode) this.badges.mintUncapped(userId, badgeCode).catch(() => {});
    }

    this.notifications
      .create(
        userId,
        'video.reward_earned',
        'You earned MSH for watching!',
        `+${payout.toFixed(2)} MSH credited to your wallet`,
        { videoId },
      )
      .catch(() => {});
  }

  private async computeEntitlement(
    reward: { payoutMode: string; amountPerUnit: number },
    userId: string,
    video: { duration: number; creatorId: string },
    watchedSeconds: number,
  ): Promise<number | null> {
    const watchedRatio = Math.min(1, watchedSeconds / video.duration);

    switch (reward.payoutMode) {
      case 'PER_MINUTE': {
        const totalMinutes = Math.floor(video.duration / 60);
        const watchedMinutes = Math.min(totalMinutes, Math.floor(watchedSeconds / 60));
        return watchedMinutes * reward.amountPerUnit;
      }
      case 'COMPLETION': {
        return watchedRatio >= COMPLETION_THRESHOLD ? reward.amountPerUnit : null;
      }
      case 'WATCH_AND_SUBSCRIBE': {
        if (watchedRatio < COMPLETION_THRESHOLD) return null;
        const subscribed = await this.prisma.creatorSubscription.findUnique({
          where: { subscriberId_creatorId: { subscriberId: userId, creatorId: video.creatorId } },
        });
        return subscribed ? reward.amountPerUnit : null;
      }
      default:
        return null;
    }
  }
}
