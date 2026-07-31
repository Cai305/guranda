import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// CCR = "creator support rate" — the flat MSH cost of each paid interaction
// (like/comment/rank) on a labeled story, paid straight to its author. Server
// is authoritative; the client only displays this for UX.
const CCR_RATE = 0.58;

const USER_SELECT = { id: true, username: true, profile: true } as const;

@Injectable()
export class StoryService {
  constructor(private prisma: PrismaService) {}

  async createStory(
    userId: string,
    dto: {
      textContent?: string;
      mediaUrl?: string;
      backgroundColor?: string;
      musicUrl?: string;
      musicTitle?: string;
      label?: string;
      stickers?: any[];
      items?: {
        name: string;
        brand?: string;
        price?: number;
        isForSale?: boolean;
      }[];
    },
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return this.prisma.story.create({
      data: {
        userId,
        textContent: dto.textContent,
        mediaUrl: dto.mediaUrl,
        backgroundColor: dto.backgroundColor,
        musicUrl: dto.musicUrl,
        musicTitle: dto.musicTitle,
        stickers: dto.stickers ?? undefined,
        label: dto.label ? dto.label.trim().toUpperCase() : null,
        expiresAt,
        items: {
          create: (dto.items ?? []).map((item) => ({
            name: item.name,
            brand: item.brand,
            price: item.price,
            isForSale: !!item.isForSale,
            sellerId: item.isForSale ? userId : null,
          })),
        },
      },
      include: { user: { select: USER_SELECT }, items: true },
    });
  }

  async getFeed(userId: string) {
    const now = new Date();
    // Get all general/ephemeral stories that haven't expired, grouped by user.
    const stories = await this.prisma.story.findMany({
      where: { expiresAt: { gt: now } },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = new Map<string, { user: any; stories: any[] }>();
    for (const story of stories) {
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, { user: story.user, stories: [] });
      }
      grouped.get(story.userId)!.stories.push(story);
    }

    const result: { userId: string; user: any; stories: any[] }[] = [];
    const myGroup = grouped.get(userId);
    if (myGroup) {
      result.push({ userId, ...myGroup });
      grouped.delete(userId);
    }
    for (const [uid, data] of grouped) {
      result.push({ userId: uid, ...data });
    }

    return result;
  }

  /** The "of the Day" feed: non-expired labeled stories, optionally filtered to one label. */
  async getLabeledFeed(label?: string) {
    const now = new Date();
    return this.prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        label: label ? label.trim().toUpperCase() : { not: null },
      },
      include: {
        user: { select: USER_SELECT },
        items: true,
        likes: true,
        comments: true,
        ranks: true,
      },
      orderBy: { likes: { _count: 'desc' } },
    });
  }

  /** Top labels by post count, plus a day-bucketed series for the top label — used by admin and by the trending-chips row in the feed. */
  async getTrendingLabels(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const labeled = await this.prisma.story.findMany({
      where: { label: { not: null }, createdAt: { gte: since } },
      select: { label: true, createdAt: true },
    });

    const counts: Record<string, number> = {};
    labeled.forEach((s) => {
      counts[s.label!] = (counts[s.label!] ?? 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }

  async deleteStory(storyId: string, userId: string) {
    return this.prisma.story.deleteMany({ where: { id: storyId, userId } });
  }

  private async chargeInteraction(storyId: string, userId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });
    if (!story) throw new NotFoundException('Story not found');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    if (Number(wallet.balanceMasheleni) < CCR_RATE) {
      throw new BadRequestException(
        `Not enough MSH — balance is ${wallet.balanceMasheleni}`,
      );
    }

    const creatorWallet = await this.prisma.wallet.findUnique({
      where: { userId: story.userId },
    });
    if (!creatorWallet)
      throw new BadRequestException("Creator's wallet not found");

    return { story, wallet, creatorWallet };
  }

  async like(storyId: string, userId: string) {
    const existing = await this.prisma.storyLike.findUnique({
      where: { storyId_userId: { storyId, userId } },
    });
    if (existing) throw new BadRequestException('Already liked');

    const { wallet, creatorWallet } = await this.chargeInteraction(
      storyId,
      userId,
    );

    const [, , , like] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { decrement: CCR_RATE } },
      }),
      this.prisma.wallet.update({
        where: { id: creatorWallet.id },
        data: { balanceMasheleni: { increment: CCR_RATE } },
      }),
      this.prisma.transaction.createMany({
        data: [
          {
            walletId: wallet.id,
            amount: -CCR_RATE,
            type: 'STORY_LIKE',
            status: 'SUCCESS',
          },
          {
            walletId: creatorWallet.id,
            amount: CCR_RATE,
            type: 'STORY_LIKE',
            status: 'SUCCESS',
          },
        ],
      }),
      this.prisma.storyLike.create({ data: { storyId, userId } }),
    ]);

    return like;
  }

  async comment(storyId: string, userId: string, text: string) {
    if (!text?.trim())
      throw new BadRequestException('Comment text is required');
    const existing = await this.prisma.storyComment.findUnique({
      where: { storyId_userId: { storyId, userId } },
    });
    if (existing) throw new BadRequestException('Already commented');

    const { wallet, creatorWallet } = await this.chargeInteraction(
      storyId,
      userId,
    );

    const [, , , comment] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { decrement: CCR_RATE } },
      }),
      this.prisma.wallet.update({
        where: { id: creatorWallet.id },
        data: { balanceMasheleni: { increment: CCR_RATE } },
      }),
      this.prisma.transaction.createMany({
        data: [
          {
            walletId: wallet.id,
            amount: -CCR_RATE,
            type: 'STORY_COMMENT',
            status: 'SUCCESS',
          },
          {
            walletId: creatorWallet.id,
            amount: CCR_RATE,
            type: 'STORY_COMMENT',
            status: 'SUCCESS',
          },
        ],
      }),
      this.prisma.storyComment.create({
        data: { storyId, userId, text: text.trim() },
      }),
    ]);

    return comment;
  }

  async rank(storyId: string, userId: string, value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      throw new BadRequestException('Rank must be an integer between 1 and 10');
    }
    const existing = await this.prisma.storyRank.findUnique({
      where: { storyId_userId: { storyId, userId } },
    });
    if (existing) throw new BadRequestException('Already ranked');

    const { wallet, creatorWallet } = await this.chargeInteraction(
      storyId,
      userId,
    );

    const [, , , rank] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { decrement: CCR_RATE } },
      }),
      this.prisma.wallet.update({
        where: { id: creatorWallet.id },
        data: { balanceMasheleni: { increment: CCR_RATE } },
      }),
      this.prisma.transaction.createMany({
        data: [
          {
            walletId: wallet.id,
            amount: -CCR_RATE,
            type: 'STORY_RANK',
            status: 'SUCCESS',
          },
          {
            walletId: creatorWallet.id,
            amount: CCR_RATE,
            type: 'STORY_RANK',
            status: 'SUCCESS',
          },
        ],
      }),
      this.prisma.storyRank.create({ data: { storyId, userId, value } }),
    ]);

    return rank;
  }

  async buyItem(storyId: string, itemId: string, buyerId: string) {
    const item = await this.prisma.storyItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.storyId !== storyId)
      throw new NotFoundException('Item not found');
    if (!item.isForSale)
      throw new BadRequestException('This item is not for sale');
    if (item.soldAt)
      throw new BadRequestException('This item has already sold');
    if (item.sellerId === buyerId)
      throw new BadRequestException('You cannot buy your own item');
    if (!item.sellerId)
      throw new BadRequestException('This item has no seller');

    const price = Number(item.price ?? 0);
    if (!(price > 0)) throw new BadRequestException('Invalid item price');

    const buyerWallet = await this.prisma.wallet.findUnique({
      where: { userId: buyerId },
    });
    if (!buyerWallet) throw new BadRequestException('Wallet not found');
    if (Number(buyerWallet.balanceMasheleni) < price) {
      throw new BadRequestException(
        `Not enough MSH — balance is ${buyerWallet.balanceMasheleni}`,
      );
    }
    const sellerWallet = await this.prisma.wallet.findUnique({
      where: { userId: item.sellerId },
    });
    if (!sellerWallet)
      throw new BadRequestException("Seller's wallet not found");

    const [, , , updatedItem] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: buyerWallet.id },
        data: { balanceMasheleni: { decrement: price } },
      }),
      this.prisma.wallet.update({
        where: { id: sellerWallet.id },
        data: { balanceMasheleni: { increment: price } },
      }),
      this.prisma.transaction.createMany({
        data: [
          {
            walletId: buyerWallet.id,
            amount: -price,
            type: 'STORY_ITEM_SALE',
            status: 'SUCCESS',
          },
          {
            walletId: sellerWallet.id,
            amount: price,
            type: 'STORY_ITEM_SALE',
            status: 'SUCCESS',
          },
        ],
      }),
      this.prisma.storyItem.update({
        where: { id: itemId },
        data: { buyerId, soldAt: new Date() },
      }),
    ]);

    return updatedItem;
  }
}
