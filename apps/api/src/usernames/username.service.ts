import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { levelForSubscribers } from '../users/reputation.util';
import {
  assertUsernameClaimable,
  normalizeUsernameLabel,
} from './username-validation.util';

const MINT_PRICE_MSH = 50;

// Guranda Username Marketplace: mirrors marketplace.service.ts's fixed/auction
// listing pattern (and its exact wallet-transfer block) almost verbatim,
// plus the reputation-snapshot mechanic that makes an established handle's
// accumulated reputation actually transfer with a sale — see activate().
@Injectable()
export class UsernameService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  // ── Claim / mint ─────────────────────────────────────────────────────

  async checkAvailability(rawLabel: string) {
    const label = normalizeUsernameLabel(rawLabel);
    if (label.length < 3)
      return {
        available: false,
        reason: 'Usernames must be at least 3 characters',
      };
    if (!/^[a-z0-9_]+$/.test(label))
      return {
        available: false,
        reason: 'Letters, numbers and underscores only',
      };
    if (await this.prisma.reservedUsername.findUnique({ where: { label } })) {
      return { available: false, reason: 'Reserved' };
    }
    if (await this.prisma.username.findUnique({ where: { label } })) {
      return { available: false, reason: 'Already taken' };
    }
    return { available: true };
  }

  /** Mint path for extra usernames beyond the one free registration claim. */
  async claimAdditional(userId: string, rawLabel: string) {
    const label = await assertUsernameClaimable(this.prisma, rawLabel);
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new BadRequestException('Wallet not found');
      if (Number(wallet.balanceMasheleni) < MINT_PRICE_MSH) {
        throw new BadRequestException(
          `Not enough MSH — minting a username costs ${MINT_PRICE_MSH}`,
        );
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { decrement: MINT_PRICE_MSH } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYMENT',
          status: 'SUCCESS',
          amount: -MINT_PRICE_MSH,
        },
      });
      return tx.username.create({
        data: { label, ownerId: userId, acquiredVia: 'MINT' },
      });
    });
  }

  /** Admin-only: mints a reserved (brand) label directly to a chosen owner — how a brand handle enters the marketplace at all. */
  async adminSeedReservedAsset(label: string, ownerId: string) {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Owner user not found');
    if (await this.prisma.username.findUnique({ where: { label } })) {
      throw new BadRequestException('That label is already a Username row');
    }
    return this.prisma.username.create({
      data: { label, ownerId, acquiredVia: 'ADMIN_SEED' },
    });
  }

  // ── Ownership + activation ───────────────────────────────────────────

  async mine(userId: string) {
    await this.expireStaleAuctions();
    return this.prisma.username.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Reputation-snapshot mechanic. Freezes the outgoing active username's
   * displayed reputation/subscribers (its own frozen score plus however much
   * live activity accrued since IT was last activated), then starts the
   * incoming username on a fresh baseline. The final `user.update` keeps
   * User.username mirroring the new label, which is why every existing
   * screen/endpoint reading user.username needs zero other changes.
   */
  async activate(userId: string, usernameId: string) {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.username.findUnique({
        where: { id: usernameId },
      });
      if (!target) throw new NotFoundException('Username not found');
      if (target.ownerId !== userId)
        throw new ForbiddenException('You do not own this username');
      if (target.isActive) return target;

      const live = await this.usersService.computeLiveActivity(userId);

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { activeUsernameId: true },
      });
      if (user?.activeUsernameId && user.activeUsernameId !== usernameId) {
        const old = await tx.username.findUnique({
          where: { id: user.activeUsernameId },
        });
        if (old) {
          const reputationScore =
            old.reputationScore +
            (live.reputation - old.activationLiveReputationBaseline);
          const subscribersScore =
            old.subscribersScore +
            (live.subscribers - old.activationLiveSubscribersBaseline);
          await tx.username.update({
            where: { id: old.id },
            data: {
              isActive: false,
              reputationScore,
              subscribersScore,
              level: levelForSubscribers(subscribersScore),
            },
          });
        }
      }

      const activated = await tx.username.update({
        where: { id: usernameId },
        data: {
          isActive: true,
          activationLiveReputationBaseline: live.reputation,
          activationLiveSubscribersBaseline: live.subscribers,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { activeUsernameId: usernameId, username: target.label },
      });

      return activated;
    });
  }

  // ── Marketplace: listings ────────────────────────────────────────────

  async createListing(
    sellerId: string,
    usernameId: string,
    dto: { listingType?: string; price: number; durationHours?: number },
  ) {
    const username = await this.prisma.username.findUnique({
      where: { id: usernameId },
    });
    if (!username) throw new NotFoundException('Username not found');
    if (username.ownerId !== sellerId)
      throw new ForbiddenException('Not your username');
    if (username.saleStatus !== 'NONE')
      throw new BadRequestException('Already listed');

    const price = Number(dto.price);
    if (!(price > 0))
      throw new BadRequestException('Price must be greater than 0');

    const listingType = dto.listingType === 'AUCTION' ? 'AUCTION' : 'FIXED';
    let auctionEndsAt: Date | undefined;
    if (listingType === 'AUCTION') {
      const durationHours = Math.min(
        168,
        Math.max(1, Number(dto.durationHours) || 24),
      );
      auctionEndsAt = new Date(Date.now() + durationHours * 3600 * 1000);
    }

    return this.prisma.username.update({
      where: { id: usernameId },
      data: {
        saleStatus: listingType,
        price,
        auctionEndsAt,
        currentBid: null,
        currentBidderId: null,
      },
    });
  }

  async cancelListing(userId: string, usernameId: string) {
    const username = await this.prisma.username.findUnique({
      where: { id: usernameId },
    });
    if (!username) throw new NotFoundException('Username not found');
    if (username.ownerId !== userId)
      throw new ForbiddenException('Not your username');
    if (username.saleStatus === 'NONE')
      throw new BadRequestException('Not currently listed');
    if (username.saleStatus === 'AUCTION' && username.currentBidderId) {
      throw new BadRequestException(
        'Cannot cancel an auction that already has bids',
      );
    }
    return this.prisma.username.update({
      where: { id: usernameId },
      data: { saleStatus: 'NONE', price: null, auctionEndsAt: null },
    });
  }

  async browse(filters: { search?: string } = {}) {
    await this.expireStaleAuctions();
    const where: any = { saleStatus: { in: ['FIXED', 'AUCTION'] } };
    if (filters.search)
      where.label = { contains: filters.search, mode: 'insensitive' };
    return this.prisma.username.findMany({
      where,
      include: {
        owner: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getListing(id: string) {
    await this.maybeFinalizeAuction(id);
    const username = await this.prisma.username.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
        bids: {
          include: {
            bidder: { select: { id: true, username: true, profile: true } },
          },
          orderBy: { amount: 'desc' },
        },
      },
    });
    if (!username) throw new NotFoundException('Username not found');
    return username;
  }

  // ── Marketplace: purchase ────────────────────────────────────────────

  /** Buyer must explicitly call activate() afterward — a purchase may be purely speculative/resale, so we never auto-flip displayed identity. */
  async buyNow(buyerId: string, usernameId: string) {
    return this.prisma.$transaction(async (tx) => {
      const username = await tx.username.findUnique({
        where: { id: usernameId },
      });
      if (!username) throw new NotFoundException('Username not found');
      if (username.saleStatus !== 'FIXED')
        throw new BadRequestException(
          'This username is not for sale at a fixed price',
        );
      if (username.ownerId === buyerId)
        throw new BadRequestException('You already own this username');

      const buyerWallet = await tx.wallet.findUnique({
        where: { userId: buyerId },
      });
      if (!buyerWallet) throw new BadRequestException('Wallet not found');
      const price = Number(username.price);
      if (Number(buyerWallet.balanceMasheleni) < price) {
        throw new BadRequestException(
          `Not enough MSH — balance is ${buyerWallet.balanceMasheleni}`,
        );
      }
      const sellerWallet = await tx.wallet.findUnique({
        where: { userId: username.ownerId },
      });
      if (!sellerWallet)
        throw new BadRequestException('Seller wallet not found');

      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { balanceMasheleni: { decrement: price } },
      });
      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balanceMasheleni: { increment: price } },
      });
      await tx.transaction.create({
        data: {
          walletId: buyerWallet.id,
          type: 'PAYMENT',
          status: 'SUCCESS',
          amount: -price,
        },
      });
      await tx.transaction.create({
        data: {
          walletId: sellerWallet.id,
          type: 'RECEIVE',
          status: 'SUCCESS',
          amount: price,
        },
      });

      await tx.usernameSale.create({
        data: { usernameId, sellerId: username.ownerId, buyerId, price },
      });

      return tx.username.update({
        where: { id: usernameId },
        data: {
          ownerId: buyerId,
          saleStatus: 'NONE',
          price: null,
          auctionEndsAt: null,
          currentBid: null,
          currentBidderId: null,
          acquiredVia: 'MARKETPLACE_BUY',
        },
      });
    });
  }

  // ── Marketplace: auctions ────────────────────────────────────────────

  async placeBid(bidderId: string, usernameId: string, amount: number) {
    await this.maybeFinalizeAuction(usernameId);
    const username = await this.prisma.username.findUnique({
      where: { id: usernameId },
    });
    if (!username) throw new NotFoundException('Username not found');
    if (username.saleStatus !== 'AUCTION')
      throw new BadRequestException('This username is not up for auction');
    if (username.ownerId === bidderId)
      throw new BadRequestException('You cannot bid on your own username');

    const floor = Number(username.currentBid ?? username.price);
    const minValid = username.currentBid ? floor + 0.01 : floor;
    if (!(amount >= minValid)) {
      throw new BadRequestException(
        `Bid must be at least ${minValid.toFixed(2)} MSH`,
      );
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: bidderId },
    });
    if (!wallet) throw new BadRequestException('Wallet not found');
    if (Number(wallet.balanceMasheleni) < amount) {
      throw new BadRequestException(
        `Not enough MSH — balance is ${wallet.balanceMasheleni}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.usernameBid.create({ data: { usernameId, bidderId, amount } });
      return tx.username.update({
        where: { id: usernameId },
        data: { currentBid: amount, currentBidderId: bidderId },
      });
    });
  }

  private async maybeFinalizeAuction(usernameId: string) {
    const username = await this.prisma.username.findUnique({
      where: { id: usernameId },
    });
    if (
      !username ||
      username.saleStatus !== 'AUCTION' ||
      !username.auctionEndsAt
    )
      return;
    if (username.auctionEndsAt > new Date()) return;
    await this.settleAuction(username);
  }

  private async expireStaleAuctions() {
    const stale = await this.prisma.username.findMany({
      where: { saleStatus: 'AUCTION', auctionEndsAt: { lte: new Date() } },
    });
    for (const username of stale) await this.settleAuction(username);
  }

  // Same "no fallback to the next-highest bidder" rule as MarketplaceService:
  // if the winner can no longer afford their own bid at close, the listing
  // just goes unsold rather than cascading to the runner-up.
  private async settleAuction(username: {
    id: string;
    ownerId: string;
    currentBid: any;
    currentBidderId: string | null;
  }) {
    if (!username.currentBidderId) {
      await this.prisma.username.update({
        where: { id: username.id },
        data: { saleStatus: 'NONE', price: null, auctionEndsAt: null },
      });
      return;
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const buyerWallet = await tx.wallet.findUnique({
          where: { userId: username.currentBidderId! },
        });
        const sellerWallet = await tx.wallet.findUnique({
          where: { userId: username.ownerId },
        });
        if (
          !buyerWallet ||
          !sellerWallet ||
          Number(buyerWallet.balanceMasheleni) < Number(username.currentBid)
        ) {
          throw new Error('insufficient funds at close');
        }
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balanceMasheleni: { decrement: username.currentBid } },
        });
        await tx.wallet.update({
          where: { id: sellerWallet.id },
          data: { balanceMasheleni: { increment: username.currentBid } },
        });
        await tx.transaction.create({
          data: {
            walletId: buyerWallet.id,
            type: 'PAYMENT',
            status: 'SUCCESS',
            amount: -username.currentBid,
          },
        });
        await tx.transaction.create({
          data: {
            walletId: sellerWallet.id,
            type: 'RECEIVE',
            status: 'SUCCESS',
            amount: username.currentBid,
          },
        });
        await tx.usernameSale.create({
          data: {
            usernameId: username.id,
            sellerId: username.ownerId,
            buyerId: username.currentBidderId!,
            price: Number(username.currentBid),
          },
        });
        await tx.username.update({
          where: { id: username.id },
          data: {
            ownerId: username.currentBidderId!,
            saleStatus: 'NONE',
            price: null,
            auctionEndsAt: null,
            currentBid: null,
            currentBidderId: null,
            acquiredVia: 'AUCTION_WIN',
          },
        });
      });
    } catch {
      await this.prisma.username.update({
        where: { id: username.id },
        data: {
          saleStatus: 'NONE',
          price: null,
          auctionEndsAt: null,
          currentBid: null,
          currentBidderId: null,
        },
      });
    }
  }
}
