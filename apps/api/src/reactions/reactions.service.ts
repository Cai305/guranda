import { Injectable, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';
import { EventBusService } from '../events/event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';

// Same upsert-by-stable-key seed pattern as AchievementsService and
// CouplesService's DEFAULT_TEMPLATES. The six PAID_LEGACY entries mirror
// gifts.service.ts's existing GIFT_CATALOG exactly (same key, same amount,
// creatorSharePct 100) so sendGift()'s hardcoded array and this DB-driven
// catalog agree on what those six types cost — this only ADDS the free and
// partial-share tiers that couldn't exist in a gift-only, always-100%,
// always-paid model.
const SEED_REACTION_TYPES: { key: string; label: string; icon: string; amount: number; creatorSharePct: number }[] = [
  // Free tier — pure engagement, no wallet transaction.
  { key: 'heart', label: 'Heart', icon: '❤️', amount: 0, creatorSharePct: 0 },
  { key: 'green_heart', label: 'Green Heart', icon: '💚', amount: 0, creatorSharePct: 0 },
  { key: 'blue_heart', label: 'Blue Heart', icon: '💙', amount: 0, creatorSharePct: 0 },
  // Premium tier — priced, creator earns a share into pendingCreatorFunds
  // (same accrual pattern as Content Contribution Remuneration), platform
  // keeps the remainder.
  { key: 'fire_heart', label: 'Fire Heart', icon: '❤️‍🔥', amount: 1.5, creatorSharePct: 70 },
  { key: 'sparkle_heart', label: 'Sparkle Heart', icon: '💖', amount: 3, creatorSharePct: 70 },
  { key: 'gift_heart', label: 'Gift Heart', icon: '💝', amount: 10, creatorSharePct: 75 },
  { key: 'cupid_heart', label: 'Cupid Heart', icon: '💘', amount: 25, creatorSharePct: 80 },
];

@Injectable()
export class ReactionsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
    private eventBus: EventBusService,
    private notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    for (const t of SEED_REACTION_TYPES) {
      await this.prisma.reactionType.upsert({
        where: { key: t.key },
        create: t,
        update: { label: t.label, icon: t.icon, amount: t.amount, creatorSharePct: t.creatorSharePct },
      });
    }
  }

  catalog() {
    return this.prisma.reactionType.findMany({ orderBy: { amount: 'asc' } });
  }

  /**
   * Send a reaction. Free reactions (amount 0) just record engagement — no
   * wallet transaction. Priced reactions atomically debit the sender in
   * full and credit the recipient's `creatorSharePct` share into
   * pendingCreatorFunds (the existing CCR accrual field) rather than an
   * instant credit — same "earn now, get paid on the scheduled payout"
   * shape as every other creator-earnings source. Reuses the `Gift` table
   * (context/contextId already supports post/story/video/live/game) rather
   * than a parallel storage model.
   */
  async react(
    senderId: string,
    recipientId: string,
    reactionKey: string,
    context: string,
    contextId?: string,
  ) {
    if (senderId === recipientId) {
      throw new BadRequestException('You cannot react to your own content');
    }
    const type = await this.prisma.reactionType.findUnique({ where: { key: reactionKey } });
    if (!type) throw new NotFoundException('Unknown reaction type');

    if (type.amount === 0) {
      const freeReaction = await this.prisma.gift.create({
        data: {
          senderId,
          recipientId,
          giftType: type.key,
          amount: 0,
          context,
          contextId: contextId ?? null,
        },
      });
      await this.notifications.create(
        recipientId,
        'reaction.received',
        `${type.icon} New reaction`,
        `Someone reacted to your ${context} with ${type.label}`,
        { reactionId: freeReaction.id, reactionKey: type.key, senderId, context, contextId },
      );
      return freeReaction;
    }

    await this.verificationService.assertVerified(senderId, 'Sending a reaction');
    const senderWallet = await this.prisma.wallet.findUnique({ where: { userId: senderId } });
    if (!senderWallet) throw new BadRequestException('Wallet not found');
    if (Number(senderWallet.balanceMasheleni) < type.amount) {
      throw new BadRequestException(`Not enough MSH — balance is ${senderWallet.balanceMasheleni}`);
    }
    const recipientWallet = await this.prisma.wallet.findUnique({ where: { userId: recipientId } });
    if (!recipientWallet) throw new NotFoundException('Recipient wallet not found');

    const creatorShare = type.amount * (type.creatorSharePct / 100);

    const [, , , reaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balanceMasheleni: { decrement: type.amount } },
      }),
      this.prisma.wallet.update({
        where: { id: recipientWallet.id },
        data: { pendingCreatorFunds: { increment: creatorShare } },
      }),
      this.prisma.transaction.create({
        data: { walletId: senderWallet.id, amount: -type.amount, type: 'REACTION_SENT', status: 'SUCCESS' },
      }),
      this.prisma.gift.create({
        data: {
          senderId,
          recipientId,
          giftType: type.key,
          amount: type.amount,
          context,
          contextId: contextId ?? null,
        },
      }),
    ]);

    await this.prisma.event.create(
      this.eventBus.write('reaction.sent', reaction.id, {
        senderId,
        recipientId,
        reactionKey,
        amount: type.amount,
        creatorShare,
      }),
    );

    await this.notifications.create(
      recipientId,
      'reaction.received',
      `${type.icon} New reaction`,
      `Someone reacted to your ${context} with ${type.label}`,
      { reactionId: reaction.id, reactionKey: type.key, senderId, context, contextId },
    );

    return reaction;
  }
}
