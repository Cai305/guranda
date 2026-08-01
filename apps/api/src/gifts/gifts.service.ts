import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';
import { LiveGateway } from '../live/live.gateway';

// The one gift catalog shared across every surface — Live streams and
// every game screen. Amounts are MSH, debited from the sender's wallet
// and credited to the recipient's, same ledger pattern as everything else.
export const GIFT_CATALOG = [
  { key: 'rose', label: 'Rose', icon: '🌹', amount: 5 },
  { key: 'heart', label: 'Heart', icon: '💜', amount: 10 },
  { key: 'confetti', label: 'Confetti', icon: '🎉', amount: 20 },
  { key: 'trophy', label: 'Trophy', icon: '🏆', amount: 50 },
  { key: 'diamond', label: 'Diamond', icon: '💎', amount: 100 },
  { key: 'rocket', label: 'Rocket', icon: '🚀', amount: 250 },
] as const;

@Injectable()
export class GiftsService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
    private liveGateway: LiveGateway,
  ) {}

  catalog() {
    return GIFT_CATALOG;
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
    if (Number(senderWallet.balanceMasheleni) < item.amount) {
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

    const [, , , , gift] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balanceMasheleni: { decrement: item.amount } },
      }),
      this.prisma.wallet.update({
        where: { id: recipientWallet.id },
        data: { balanceMasheleni: { increment: item.amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: -item.amount,
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
