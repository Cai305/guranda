import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BlueprintStatus, FeaturePricingType, MarketplaceVisibility } from '@prisma/client';

// Phase 4 — Blueprint Marketplace: publish/browse/purchase/review on top of
// the Phase 1/2 Blueprint/BlueprintVersion/BlueprintRun models. Mirrors
// FeatureMarketplaceService's real wallet-transaction shape exactly (see
// that service's doc comment for the CampaignsService/UsernameService
// precedent). No "install" step here — a Blueprint isn't a standing
// capability the way a Feature is; purchasing one grants the buyer the
// right to call BlueprintExecutionService.runBlueprint on it (see that
// service's assertCanRun), which is the real "using" of a Blueprint.
@Injectable()
export class BlueprintMarketplaceService {
  constructor(private prisma: PrismaService) {}

  async publish(userId: string, blueprintId: string) {
    const blueprint = await this.getBlueprintOr404(blueprintId);
    if (blueprint.createdByUserId !== userId) {
      throw new ForbiddenException('Only the creator of this Blueprint may publish it');
    }
    const versionCount = await this.prisma.blueprintVersion.count({ where: { blueprintId } });
    if (versionCount === 0) {
      throw new BadRequestException(
        'This Blueprint has no version yet — create a version before publishing',
      );
    }
    return this.prisma.blueprint.update({
      where: { id: blueprint.id },
      data: {
        status: BlueprintStatus.PUBLISHED,
        visibility:
          blueprint.visibility === MarketplaceVisibility.PRIVATE
            ? MarketplaceVisibility.MARKETPLACE
            : blueprint.visibility,
      },
    });
  }

  async browse(filters: { search?: string; pricingType?: FeaturePricingType }) {
    return this.prisma.blueprint.findMany({
      where: {
        status: BlueprintStatus.PUBLISHED,
        visibility: { in: [MarketplaceVisibility.PUBLIC, MarketplaceVisibility.MARKETPLACE] },
        ...(filters.pricingType ? { pricingType: filters.pricingType } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' as const } },
                { description: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { createdByUser: { select: { id: true, username: true } } },
    });
  }

  /**
   * Real atomic wallet debit/credit + Transaction + BlueprintPurchase row,
   * same shape as FeatureMarketplaceService.purchase(). SUBSCRIPTION
   * pricing isn't implemented for Blueprints (Blueprint.pricingType reuses
   * FeaturePricingType so the field never needs a second enum, but only
   * FREE/PAID purchase flows are real here — see schema.prisma's
   * Blueprint.pricingType comment).
   */
  async purchase(userId: string, blueprintId: string) {
    const blueprint = await this.getBlueprintOr404(blueprintId);
    if (blueprint.status !== BlueprintStatus.PUBLISHED) {
      throw new BadRequestException('This Blueprint is not published');
    }
    if (blueprint.createdByUserId === userId) {
      throw new BadRequestException('You already own this Blueprint — no need to purchase it');
    }
    if (blueprint.pricingType === FeaturePricingType.FREE) {
      throw new BadRequestException('This Blueprint is free — run it directly, no purchase needed');
    }
    if (blueprint.pricingType === FeaturePricingType.SUBSCRIPTION) {
      throw new BadRequestException('Subscription pricing is not supported for Blueprints yet');
    }
    if (!(blueprint.price > 0)) {
      throw new BadRequestException('This Blueprint has no valid price configured');
    }

    const existing = await this.prisma.blueprintPurchase.findFirst({
      where: { blueprintId, buyerUserId: userId, refundedAt: null },
    });
    if (existing) {
      throw new BadRequestException('You already purchased this Blueprint');
    }

    const price = blueprint.price;
    const sellerUserId = blueprint.createdByUserId;

    return this.prisma.$transaction(async (tx) => {
      const buyerWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!buyerWallet) throw new BadRequestException('Wallet not found');
      if (Number(buyerWallet.balanceMasheleni) < price) {
        throw new BadRequestException(
          `Not enough Rand — balance is R${buyerWallet.balanceMasheleni}, this Blueprint costs R${price}`,
        );
      }
      const sellerWallet = await tx.wallet.findUnique({ where: { userId: sellerUserId } });
      if (!sellerWallet) throw new BadRequestException("Seller's wallet not found");

      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { balanceMasheleni: { decrement: price } },
      });
      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balanceMasheleni: { increment: price } },
      });

      const buyerTx = await tx.transaction.create({
        data: { walletId: buyerWallet.id, amount: -price, type: 'BLUEPRINT_PURCHASE', status: 'SUCCESS' },
      });
      await tx.transaction.create({
        data: { walletId: sellerWallet.id, amount: price, type: 'BLUEPRINT_PURCHASE', status: 'SUCCESS' },
      });

      return tx.blueprintPurchase.create({
        data: {
          blueprintId,
          buyerUserId: userId,
          sellerUserId,
          pricePaid: price,
          transactionId: buyerTx.id,
        },
      });
    });
  }

  /** Gated on a real, unrefunded BlueprintPurchase — the creator never needs one (they can always run their own Blueprint; see BlueprintExecutionService.assertCanRun). */
  async review(userId: string, blueprintId: string, rating: number, comment?: string) {
    if (!(rating >= 1 && rating <= 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    await this.getBlueprintOr404(blueprintId);
    const purchased = await this.prisma.blueprintPurchase.findFirst({
      where: { blueprintId, buyerUserId: userId, refundedAt: null },
    });
    if (!purchased) {
      throw new BadRequestException('You must purchase this Blueprint before reviewing it');
    }
    return this.prisma.blueprintReview.upsert({
      where: { blueprintId_userId: { blueprintId, userId } },
      create: { blueprintId, userId, rating, comment },
      update: { rating, comment },
    });
  }

  async getBlueprintWithStats(blueprintId: string) {
    const blueprint = await this.prisma.blueprint.findUnique({
      where: { id: blueprintId },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        createdByUser: { select: { id: true, username: true } },
      },
    });
    if (!blueprint) throw new NotFoundException(`Blueprint "${blueprintId}" not found`);

    const [ratingAgg, purchaseCount, reviews] = await Promise.all([
      this.prisma.blueprintReview.aggregate({
        where: { blueprintId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.blueprintPurchase.count({ where: { blueprintId, refundedAt: null } }),
      this.prisma.blueprintReview.findMany({
        where: { blueprintId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { id: true, username: true } } },
      }),
    ]);

    return {
      ...blueprint,
      stats: {
        averageRating: ratingAgg._avg.rating ?? 0,
        reviewCount: ratingAgg._count.rating,
        purchaseCount,
      },
      reviews,
    };
  }

  private async getBlueprintOr404(id: string) {
    const blueprint = await this.prisma.blueprint.findUnique({ where: { id } });
    if (!blueprint) throw new NotFoundException(`Blueprint "${id}" not found`);
    return blueprint;
  }
}
