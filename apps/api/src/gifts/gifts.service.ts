import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';
import { LiveGateway } from '../live/live.gateway';
import { WalletsService } from '../wallets/wallets.service';

// The one gift catalog shared across every surface — Live streams and
// every game screen. Amounts are MSH, debited from the sender's wallet
// and credited to the recipient's, same ledger pattern as everything else.
// Spans 1 MSH to 10,000 MSH. The original 6 keys (rose/heart/confetti/
// trophy/diamond/rocket) keep their exact key/icon/amount — they're
// referenced by historical Gift rows and a couple of hardcoded emoji
// fallback maps, so renaming or reordering them would misrender old data.
export const GIFT_CATALOG = [
  { key: 'spark', label: 'Spark', icon: '✨', amount: 1 },
  { key: 'wave', label: 'Wave', icon: '👋', amount: 2 },
  { key: 'coffee', label: 'Coffee', icon: '☕', amount: 3 },
  { key: 'clap', label: 'Clap', icon: '👏', amount: 4 },
  { key: 'rose', label: 'Rose', icon: '🌹', amount: 5 },
  { key: 'fire', label: 'Fire', icon: '🔥', amount: 8 },
  { key: 'heart', label: 'Heart', icon: '💜', amount: 10 },
  { key: 'balloon', label: 'Balloon', icon: '🎈', amount: 15 },
  { key: 'confetti', label: 'Confetti', icon: '🎉', amount: 20 },
  { key: 'cake', label: 'Cake', icon: '🎂', amount: 30 },
  { key: 'trophy', label: 'Trophy', icon: '🏆', amount: 50 },
  { key: 'crown', label: 'Crown', icon: '👑', amount: 75 },
  { key: 'diamond', label: 'Diamond', icon: '💎', amount: 100 },
  { key: 'unicorn', label: 'Unicorn', icon: '🦄', amount: 150 },
  { key: 'rocket', label: 'Rocket', icon: '🚀', amount: 250 },
  { key: 'medal', label: 'Gold Medal', icon: '🥇', amount: 350 },
  { key: 'fireworks', label: 'Fireworks', icon: '🎆', amount: 500 },
  { key: 'ring', label: 'Diamond Ring', icon: '💍', amount: 750 },
  { key: 'sportscar', label: 'Sports Car', icon: '🏎️', amount: 1000 },
  { key: 'yacht', label: 'Yacht', icon: '🛥️', amount: 2000 },
  { key: 'mansion', label: 'Mansion', icon: '🏰', amount: 3500 },
  { key: 'jet', label: 'Private Jet', icon: '🛩️', amount: 5000 },
  { key: 'planet', label: 'Planet', icon: '🪐', amount: 7500 },
  { key: 'galaxy', label: 'Galaxy', icon: '🌌', amount: 10000 },
] as const;

// Badge utility (vision §12: badges unlock real access, not just display).
// The three supply-capped, genuinely scarce badges — not the uncapped
// achievement-linked ones — earn their holder a standing discount on the
// MSH cost of SENDING a gift. The recipient still receives the full
// catalog amount; the platform absorbs the difference, same pattern as
// the registration welcome bonus and CCR payouts (both already credit MSH
// with no matching debit elsewhere in the ledger).
export const GIFT_DISCOUNT_BADGE_CODES = ['FOUNDER', 'OG_CREATOR', 'EARLY_LIVE_HOST'] as const;
export const GIFT_DISCOUNT_RATE = 0.1;

@Injectable()
export class GiftsService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
    private liveGateway: LiveGateway,
    private wallets: WalletsService,
  ) {}

  catalog() {
    return GIFT_CATALOG;
  }

  /**
   * Whether this user currently gets the scarce-badge gift discount, and
   * which badge earned it — surfaced separately from catalog() (which is
   * a static list, not user-specific) so GiftSheet can show "Unlocked by
   * your Founder badge" before the sender even picks a gift.
   */
  async myGiftDiscount(userId: string) {
    const owned = await this.prisma.userBadge.findFirst({
      where: { userId, badge: { code: { in: [...GIFT_DISCOUNT_BADGE_CODES] } } },
      include: { badge: true },
      // FOUNDER > OG_CREATOR > EARLY_LIVE_HOST — if a user holds more than
      // one, show the earliest/most prestigious one earned.
      orderBy: { mintedAt: 'asc' },
    });
    return {
      active: !!owned,
      rate: GIFT_DISCOUNT_RATE,
      badgeCode: owned?.badge.code ?? null,
      badgeName: owned?.badge.name ?? null,
    };
  }

  /**
   * Shared validation + pricing for sendGift/sendGiftViaHold — everything
   * up to "we know it's legal and how much it costs", with no wallet
   * mutation yet. The two callers differ only in how they move the money:
   * sendGift debits instantly (unchanged UI-driven path — GiftButton/
   * GiftSheet), sendGiftViaHold reserves via WalletsService.holdFunds
   * first (the AI tool path — see docs/19 §7's "hold -> confirm -> capture
   * instead of instant-debit-only" note).
   */
  private async resolveGift(
    senderId: string,
    dto: {
      recipientId: string;
      giftType: string;
      context: string;
      contextId?: string;
      message?: string;
    },
  ) {
    await this.verificationService.assertVerified(senderId, 'Sending a gift');

    if (!dto.recipientId || dto.recipientId === senderId) {
      throw new BadRequestException(
        'Choose a valid recipient — you cannot gift yourself',
      );
    }
    if (!['live', 'game', 'video', 'story'].includes(dto.context)) {
      throw new BadRequestException('Invalid gift context');
    }
    // For content gifts, recipientId is trust-but-verify: the client already
    // knows the creator/owner id from the video/story it loaded, but we
    // don't take its word for it — otherwise a client could send a
    // 'video'-context gift to any arbitrary user by lying about recipientId.
    if (dto.context === 'video' || dto.context === 'story') {
      if (!dto.contextId) {
        throw new BadRequestException(
          `contextId is required for a ${dto.context} gift`,
        );
      }
      const ownerId =
        dto.context === 'video'
          ? (
              await this.prisma.video.findUnique({
                where: { id: dto.contextId },
                select: { creatorId: true },
              })
            )?.creatorId
          : (
              await this.prisma.story.findUnique({
                where: { id: dto.contextId },
                select: { userId: true },
              })
            )?.userId;
      if (!ownerId) {
        throw new NotFoundException(
          `${dto.context === 'video' ? 'Video' : 'Story'} not found`,
        );
      }
      if (ownerId !== dto.recipientId) {
        throw new BadRequestException(
          `Recipient does not match this ${dto.context}'s owner`,
        );
      }
    }
    const item = GIFT_CATALOG.find((g) => g.key === dto.giftType);
    if (!item) {
      throw new BadRequestException('Unknown gift type');
    }

    const senderWallet = await this.prisma.wallet.findUnique({
      where: { userId: senderId },
    });
    if (!senderWallet) throw new BadRequestException('Wallet not found');

    // Badge-holder discount — real backend enforcement, not a client-side
    // display flag. The sender pays a scarce-badge-discounted price; the
    // recipient still receives the full catalog amount (see myGiftDiscount
    // above for why that's not a ledger integrity problem here).
    const discount = await this.myGiftDiscount(senderId);
    const cost = discount.active
      ? Math.round(item.amount * (1 - discount.rate) * 100) / 100
      : item.amount;

    if (Number(senderWallet.balanceMasheleni) < cost) {
      throw new BadRequestException(
        `Not enough MSH — balance is ${senderWallet.balanceMasheleni}`,
      );
    }
    const recipientWallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.recipientId },
    });
    if (!recipientWallet)
      throw new NotFoundException('Recipient wallet not found');

    const [sender] = await this.prisma.user.findMany({
      where: { id: senderId },
      select: { username: true, profile: true },
    });

    return { item, cost, senderWallet, recipientWallet, sender };
  }

  private broadcastIfLive(
    dto: { context: string; contextId?: string; message?: string },
    item: (typeof GIFT_CATALOG)[number],
    sender: { username: string; profile: { displayName: string | null } | null } | undefined,
  ) {
    if (dto.context === 'live' && dto.contextId) {
      this.liveGateway.broadcastGift(dto.contextId, {
        giftType: item.key,
        icon: item.icon,
        label: item.label,
        amount: item.amount,
        senderName:
          sender?.profile?.displayName || sender?.username || 'Someone',
        message: dto.message ?? null,
      });
    }
  }

  async sendGift(
    senderId: string,
    dto: {
      recipientId: string;
      giftType: string;
      context: string;
      contextId?: string;
      message?: string;
    },
  ) {
    const { item, cost, senderWallet, recipientWallet, sender } =
      await this.resolveGift(senderId, dto);

    const [, , , , gift] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balanceMasheleni: { decrement: cost } },
      }),
      this.prisma.wallet.update({
        where: { id: recipientWallet.id },
        data: { balanceMasheleni: { increment: item.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: -cost,
          type: 'GIFT_SENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: recipientWallet.id,
          amount: item.amount,
          type: 'GIFT_RECEIVED',
          status: 'SUCCESS',
        },
      }),
      this.prisma.gift.create({
        data: {
          senderId,
          recipientId: dto.recipientId,
          giftType: item.key,
          amount: item.amount,
          context: dto.context,
          contextId: dto.contextId ?? null,
          message: dto.message ?? null,
        },
      }),
    ]);

    this.broadcastIfLive(dto, item, sender);

    return gift;
  }

  /**
   * The AI tool path (see gifts-ai-tools.provider.ts's `send`): same
   * validation/pricing as sendGift, but reserves the sender's cost via
   * WalletsService.holdFunds first — checked against availableBalance
   * (accounts for any other concurrent holds) rather than sendGift's plain
   * balance read — then settles (debit sender, credit recipient, create
   * the Gift row) and marks the hold CAPTURED in one atomic transaction.
   * Gives every AI-initiated gift a real WalletHold audit row (reason +
   * CAPTURED status) that a plain instant debit wouldn't have. The UI-
   * driven GiftButton/GiftSheet flow is untouched — it still calls
   * sendGift above.
   */
  async sendGiftViaHold(
    senderId: string,
    dto: {
      recipientId: string;
      giftType: string;
      context: string;
      contextId?: string;
      message?: string;
    },
  ) {
    const { item, cost, senderWallet, recipientWallet, sender } =
      await this.resolveGift(senderId, dto);

    const hold = await this.wallets.holdFunds(
      senderWallet.id,
      cost,
      `gift:${item.key}`,
    );

    const [, , , , , gift] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balanceMasheleni: { decrement: cost } },
      }),
      this.prisma.wallet.update({
        where: { id: recipientWallet.id },
        data: { balanceMasheleni: { increment: item.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: -cost,
          type: 'GIFT_SENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: recipientWallet.id,
          amount: item.amount,
          type: 'GIFT_RECEIVED',
          status: 'SUCCESS',
        },
      }),
      this.prisma.walletHold.update({
        where: { id: hold.id },
        data: { status: 'CAPTURED', resolvedAt: new Date() },
      }),
      this.prisma.gift.create({
        data: {
          senderId,
          recipientId: dto.recipientId,
          giftType: item.key,
          amount: item.amount,
          context: dto.context,
          contextId: dto.contextId ?? null,
          message: dto.message ?? null,
        },
      }),
    ]);

    this.broadcastIfLive(dto, item, sender);

    return gift;
  }

  async sentByMe(userId: string) {
    return this.prisma.gift.findMany({
      where: { senderId: userId },
      include: {
        recipient: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async receivedByMe(userId: string) {
    return this.prisma.gift.findMany({
      where: { recipientId: userId },
      include: {
        sender: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Gifts sent to a specific piece of content (a video or a story) —
  // public total + count, and the most recent gifts with sender identity
  // (gifts are public the same way likes are, unlike bookmarks).
  async forContent(context: string, contextId: string) {
    const [agg, recent] = await Promise.all([
      this.prisma.gift.aggregate({
        where: { context, contextId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.gift.findMany({
        where: { context, contextId },
        include: { sender: { select: { id: true, username: true, profile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return {
      total: agg._sum.amount ?? 0,
      count: agg._count,
      recent,
    };
  }

  async statsForUser(userId: string) {
    const [received, sent] = await Promise.all([
      this.prisma.gift.findMany({
        where: { recipientId: userId },
        select: { amount: true },
      }),
      this.prisma.gift.findMany({
        where: { senderId: userId },
        select: { amount: true },
      }),
    ]);
    return {
      totalReceived: received.reduce((sum, g) => sum + g.amount, 0),
      receivedCount: received.length,
      totalSent: sent.reduce((sum, g) => sum + g.amount, 0),
      sentCount: sent.length,
    };
  }
}
