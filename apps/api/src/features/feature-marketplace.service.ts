import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  Feature,
  FeaturePricingType,
  FeatureStatus,
  MarketplaceVisibility,
} from '@prisma/client';

// Phase 4 — Feature Marketplace: publish/browse/purchase/install/review on
// top of the Phase 1 Feature/FeatureVersion/FeatureInstallation models.
// Money moves through the SAME real internal wallet ledger every other
// paid flow in this codebase uses (see CampaignsService.approve() /
// UsernameService.buyNow() — this mirrors that exact atomic-transaction
// shape) — no external payment processor, nothing mocked. FeaturesService
// (Phase 1) stays the plain CRUD surface; this service owns everything
// with money or entitlement attached to it.
@Injectable()
export class FeatureMarketplaceService {
  constructor(private prisma: PrismaService) {}

  /** Only the creator, and only once the Feature has a real published version to install. */
  async publish(userId: string, featureId: string) {
    const feature = await this.getFeatureOr404(featureId);
    if (feature.createdByUserId !== userId) {
      throw new ForbiddenException('Only the creator of this Feature may publish it');
    }
    if (!feature.currentVersionId) {
      throw new BadRequestException(
        'This Feature has no version yet — create a version before publishing',
      );
    }
    return this.prisma.feature.update({
      where: { id: feature.id },
      data: {
        status: FeatureStatus.PUBLISHED,
        // A freshly-created Feature defaults to PRIVATE visibility (Phase 1
        // default) — publishing to the Marketplace should actually make it
        // findable, so bump PRIVATE up to MARKETPLACE. An author who already
        // chose SHARED/ORGANIZATION/etc. explicitly keeps that choice.
        visibility:
          feature.visibility === MarketplaceVisibility.PRIVATE
            ? MarketplaceVisibility.MARKETPLACE
            : feature.visibility,
      },
    });
  }

  async browse(filters: { search?: string; category?: string; pricingType?: FeaturePricingType }) {
    return this.prisma.feature.findMany({
      where: {
        status: FeatureStatus.PUBLISHED,
        visibility: { in: [MarketplaceVisibility.PUBLIC, MarketplaceVisibility.MARKETPLACE] },
        ...(filters.category ? { category: filters.category } : {}),
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
   * Real atomic wallet debit/credit + Transaction + FeaturePurchase row —
   * exactly CampaignsService.approve()'s pattern. FREE Features never reach
   * the payment branch (there's nothing to buy — install() handles them
   * directly); SUBSCRIPTION Features also open a FeatureSubscription
   * entitlement window alongside the one-off purchase record for this
   * period.
   */
  async purchase(userId: string, featureId: string) {
    const feature = await this.getFeatureOr404(featureId);
    if (feature.status !== FeatureStatus.PUBLISHED) {
      throw new BadRequestException('This Feature is not published');
    }
    if (feature.createdByUserId === userId) {
      throw new BadRequestException('You already own this Feature — no need to purchase it');
    }
    if (feature.pricingType === FeaturePricingType.FREE) {
      throw new BadRequestException('This Feature is free — install it directly, no purchase needed');
    }
    if (!(feature.price > 0)) {
      throw new BadRequestException('This Feature has no valid price configured');
    }

    const alreadyOwned = await this.hasEntitlement(userId, feature);
    if (alreadyOwned) {
      throw new BadRequestException('You already have access to this Feature');
    }

    const price = feature.price;
    const sellerUserId = feature.createdByUserId;

    return this.prisma.$transaction(async (tx) => {
      const buyerWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!buyerWallet) throw new BadRequestException('Wallet not found');
      if (Number(buyerWallet.balanceMasheleni) < price) {
        throw new BadRequestException(
          `Not enough Rand — balance is R${buyerWallet.balanceMasheleni}, this Feature costs R${price}`,
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
        data: { walletId: buyerWallet.id, amount: -price, type: 'FEATURE_PURCHASE', status: 'SUCCESS' },
      });
      await tx.transaction.create({
        data: { walletId: sellerWallet.id, amount: price, type: 'FEATURE_PURCHASE', status: 'SUCCESS' },
      });

      const purchase = await tx.featurePurchase.create({
        data: {
          featureId,
          buyerUserId: userId,
          sellerUserId,
          pricePaid: price,
          transactionId: buyerTx.id,
        },
      });

      if (feature.pricingType === FeaturePricingType.SUBSCRIPTION) {
        const periodStart = new Date();
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 30);
        await tx.featureSubscription.create({
          data: {
            featureId,
            userId,
            pricePerPeriod: price,
            periodStart,
            periodEnd,
          },
        });
      }

      return purchase;
    });
  }

  /** For a PAID/SUBSCRIPTION Feature, requires a real entitlement (purchase or active subscription) first — the owner always may install their own Feature. FREE installs directly. */
  async install(userId: string, featureId: string) {
    const feature = await this.getFeatureOr404(featureId);
    if (!feature.currentVersionId) {
      throw new BadRequestException('This Feature has no version to install yet');
    }
    if (feature.pricingType !== FeaturePricingType.FREE && feature.createdByUserId !== userId) {
      const entitled = await this.hasEntitlement(userId, feature);
      if (!entitled) {
        throw new BadRequestException('Purchase this Feature before installing it');
      }
    }

    const existing = await this.prisma.featureInstallation.findFirst({
      where: { featureId, userId, uninstalledAt: null },
    });
    if (existing) return existing;

    return this.prisma.featureInstallation.create({
      data: { featureId, userId, versionId: feature.currentVersionId },
    });
  }

  async uninstall(userId: string, featureId: string) {
    const installation = await this.prisma.featureInstallation.findFirst({
      where: { featureId, userId, uninstalledAt: null },
    });
    if (!installation) {
      throw new NotFoundException('No active installation of this Feature found');
    }
    return this.prisma.featureInstallation.update({
      where: { id: installation.id },
      data: { uninstalledAt: new Date() },
    });
  }

  async myInstalled(userId: string) {
    return this.prisma.featureInstallation.findMany({
      where: { userId, uninstalledAt: null },
      include: { feature: true, version: true },
      orderBy: { installedAt: 'desc' },
    });
  }

  /** Gated on a real, active FeatureInstallation — never allowed from someone who never installed it. One review per user per Feature (upsert lets them revise their own rating later). */
  async review(userId: string, featureId: string, rating: number, comment?: string) {
    if (!(rating >= 1 && rating <= 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    await this.getFeatureOr404(featureId);
    const installed = await this.prisma.featureInstallation.findFirst({
      where: { featureId, userId, uninstalledAt: null },
    });
    if (!installed) {
      throw new BadRequestException('You must install this Feature before reviewing it');
    }
    return this.prisma.featureReview.upsert({
      where: { featureId_userId: { featureId, userId } },
      create: { featureId, userId, rating, comment },
      update: { rating, comment },
    });
  }

  /** Real aggregate — average rating, review count, active-install count — computed from live rows, never cached. */
  async getFeatureWithStats(featureId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        currentVersion: true,
        versions: { orderBy: { createdAt: 'desc' } },
        createdByUser: { select: { id: true, username: true } },
      },
    });
    if (!feature) throw new NotFoundException(`Feature "${featureId}" not found`);

    const [ratingAgg, installCount, purchaseCount, reviews] = await Promise.all([
      this.prisma.featureReview.aggregate({
        where: { featureId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.featureInstallation.count({ where: { featureId, uninstalledAt: null } }),
      this.prisma.featurePurchase.count({ where: { featureId, refundedAt: null } }),
      this.prisma.featureReview.findMany({
        where: { featureId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { id: true, username: true } } },
      }),
    ]);

    return {
      ...feature,
      stats: {
        averageRating: ratingAgg._avg.rating ?? 0,
        reviewCount: ratingAgg._count.rating,
        installCount,
        purchaseCount,
      },
      reviews,
    };
  }

  /** True if `userId` already has real, unexpired access to a non-free Feature — an unrefunded FeaturePurchase, or an active, unexpired FeatureSubscription. */
  private async hasEntitlement(userId: string, feature: Feature): Promise<boolean> {
    const purchase = await this.prisma.featurePurchase.findFirst({
      where: { featureId: feature.id, buyerUserId: userId, refundedAt: null },
    });
    if (purchase) return true;
    if (feature.pricingType === FeaturePricingType.SUBSCRIPTION) {
      const activeSub = await this.prisma.featureSubscription.findFirst({
        where: { featureId: feature.id, userId, status: 'ACTIVE', periodEnd: { gt: new Date() } },
      });
      if (activeSub) return true;
    }
    return false;
  }

  private async getFeatureOr404(id: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id } });
    if (!feature) throw new NotFoundException(`Feature "${id}" not found`);
    return feature;
  }
}
