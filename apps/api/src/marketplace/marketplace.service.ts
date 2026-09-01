import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Guranda Marketplace: any user can list an item for a fixed price or run
// an auction. Fixed-price sales settle instantly; auctions accumulate
// bids and settle (lazily, on next read) once they expire. Everything
// is paid straight from the MSH wallet ledger.

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private generateInvoiceNumber() {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${stamp}-${rand}`;
  }

  // ── Listings ─────────────────────────────────────────────────────────

  async createListing(sellerId: string, dto: any) {
    if (!dto.title || !dto.price || !dto.category || !dto.condition) {
      throw new BadRequestException(
        'Title, price, category and condition are required',
      );
    }
    const images: string[] = Array.isArray(dto.images)
      ? dto.images.filter(Boolean)
      : [];
    if (images.length < 1) {
      throw new BadRequestException('At least one photo is required');
    }
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

    return this.prisma.marketplaceListing.create({
      data: {
        sellerId,
        title: dto.title,
        description: dto.description || null,
        category: dto.category,
        condition: dto.condition,
        images,
        listingType,
        price,
        auctionEndsAt,
      },
    });
  }

  async browse(filters: {
    category?: string;
    listingType?: string;
    search?: string;
  }) {
    await this.expireStaleAuctions();
    const where: any = { status: 'ACTIVE' };
    if (filters.category) where.category = filters.category;
    if (filters.listingType) where.listingType = filters.listingType;
    if (filters.search)
      where.title = { contains: filters.search, mode: 'insensitive' };

    return this.prisma.marketplaceListing.findMany({
      where,
      include: {
        seller: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getListing(id: string) {
    await this.maybeFinalizeAuction(id);
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, username: true, profile: true } },
        bids: {
          include: {
            bidder: { select: { id: true, username: true, profile: true } },
          },
          orderBy: { amount: 'desc' },
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async myListings(userId: string) {
    await this.expireStaleAuctions();
    return this.prisma.marketplaceListing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { bids: true },
    });
  }

  async myBids(userId: string) {
    const myBidListings = await this.prisma.marketplaceBid.findMany({
      where: { bidderId: userId },
      distinct: ['listingId'],
      select: { listingId: true },
    });
    const ids = myBidListings.map((b) => b.listingId);
    return this.prisma.marketplaceListing.findMany({
      where: { OR: [{ id: { in: ids } }, { buyerId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        seller: { select: { id: true, username: true, profile: true } },
      },
    });
  }

  // ── Invoices ─────────────────────────────────────────────────────────

  async myInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: {
        buyer: { select: { id: true, username: true, profile: true } },
        seller: { select: { id: true, username: true, profile: true } },
        listing: { select: { id: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, username: true, profile: true } },
        seller: { select: { id: true, username: true, profile: true } },
        listing: {
          select: { id: true, images: true, category: true, condition: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.buyerId !== userId && invoice.sellerId !== userId) {
      throw new ForbiddenException('Not your invoice');
    }
    return invoice;
  }

  async cancelListing(userId: string, listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== userId)
      throw new ForbiddenException('Not your listing');
    if (listing.status !== 'ACTIVE')
      throw new BadRequestException('Only active listings can be cancelled');
    if (listing.listingType === 'AUCTION' && listing.currentBidderId) {
      throw new BadRequestException(
        'Cannot cancel an auction that already has bids',
      );
    }
    return this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: 'CANCELLED' },
    });
  }

  async updateListing(userId: string, listingId: string, dto: any) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== userId)
      throw new ForbiddenException('Not your listing');
    if (listing.status !== 'ACTIVE')
      throw new BadRequestException('Only active listings can be edited');
    return this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
        ...(dto.images !== undefined ? { images: dto.images } : {}),
        ...(dto.price !== undefined ? { price: Number(dto.price) } : {}),
      },
    });
  }

  async deleteListing(userId: string, listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== userId)
      throw new ForbiddenException('Not your listing');
    if (listing.status !== 'ACTIVE')
      throw new BadRequestException('Only active listings can be deleted');
    if (listing.listingType === 'AUCTION' && listing.currentBidderId) {
      throw new BadRequestException(
        'Cannot delete an auction that already has bids',
      );
    }
    await this.prisma.marketplaceListing.delete({ where: { id: listingId } });
    return { success: true };
  }

  // ── Fixed-price purchase ────────────────────────────────────────────

  async buyNow(buyerId: string, listingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.findUnique({
        where: { id: listingId },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.status !== 'ACTIVE')
        throw new BadRequestException('This listing is no longer available');
      if (listing.listingType !== 'FIXED')
        throw new BadRequestException(
          'This is an auction — place a bid instead',
        );
      if (listing.sellerId === buyerId)
        throw new BadRequestException('You cannot buy your own listing');

      const buyerWallet = await tx.wallet.findUnique({
        where: { userId: buyerId },
      });
      if (!buyerWallet) throw new BadRequestException('Wallet not found');
      if (Number(buyerWallet.balanceMasheleni) < listing.price) {
        throw new BadRequestException(
          `Not enough MSH — balance is ${buyerWallet.balanceMasheleni}`,
        );
      }
      const sellerWallet = await tx.wallet.findUnique({
        where: { userId: listing.sellerId },
      });
      if (!sellerWallet)
        throw new BadRequestException('Seller wallet not found');

      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { balanceMasheleni: { decrement: listing.price } },
      });
      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balanceMasheleni: { increment: listing.price } },
      });
      await tx.transaction.create({
        data: {
          walletId: buyerWallet.id,
          type: 'PAYMENT',
          status: 'SUCCESS',
          amount: -listing.price,
        },
      });
      await tx.transaction.create({
        data: {
          walletId: sellerWallet.id,
          type: 'RECEIVE',
          status: 'SUCCESS',
          amount: listing.price,
        },
      });

      const sold = await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'SOLD', buyerId, soldAt: new Date() },
      });

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: this.generateInvoiceNumber(),
          listingId: sold.id,
          buyerId,
          sellerId: listing.sellerId,
          itemTitle: listing.title,
          amount: listing.price,
        },
      });

      return { ...sold, invoiceId: invoice.id };
    });
  }

  // ── Auctions ─────────────────────────────────────────────────────────

  async placeBid(bidderId: string, listingId: string, amount: number) {
    await this.maybeFinalizeAuction(listingId);
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== 'ACTIVE')
      throw new BadRequestException('This auction has ended');
    if (listing.listingType !== 'AUCTION')
      throw new BadRequestException('This is a fixed-price listing');
    if (listing.sellerId === bidderId)
      throw new BadRequestException('You cannot bid on your own listing');

    const floor = Number(listing.currentBid ?? listing.price);
    const minValid = listing.currentBid ? floor + 0.01 : floor;
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

    const previousBidderId = listing.currentBidderId;
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.marketplaceBid.create({ data: { listingId, bidderId, amount } });
      return tx.marketplaceListing.update({
        where: { id: listingId },
        data: { currentBid: amount, currentBidderId: bidderId },
      });
    });

    if (previousBidderId && previousBidderId !== bidderId) {
      await this.notifications.create(
        previousBidderId,
        'marketplace.outbid',
        "You've been outbid",
        `Someone placed a higher bid on "${listing.title}"`,
        { listingId, amount },
      );
    }

    return updated;
  }

  private async maybeFinalizeAuction(listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (
      !listing ||
      listing.status !== 'ACTIVE' ||
      listing.listingType !== 'AUCTION' ||
      !listing.auctionEndsAt
    )
      return;
    if (listing.auctionEndsAt > new Date()) return;
    await this.settleAuction(listing);
  }

  private async expireStaleAuctions() {
    const stale = await this.prisma.marketplaceListing.findMany({
      where: {
        status: 'ACTIVE',
        listingType: 'AUCTION',
        auctionEndsAt: { lte: new Date() },
      },
    });
    for (const listing of stale) await this.settleAuction(listing);
  }

  // Charges the winning bidder and pays the seller. If the winner can no
  // longer afford their own bid, the listing simply expires unsold —
  // there's only one auction copy of this item, so there's no fallback
  // to the next-highest bidder.
  private async settleAuction(listing: {
    id: string;
    sellerId: string;
    currentBid: any;
    currentBidderId: string | null;
  }) {
    if (!listing.currentBidderId) {
      await this.prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: { status: 'EXPIRED' },
      });
      return;
    }
    try {
      const sold = await this.prisma.$transaction(async (tx) => {
        const buyerWallet = await tx.wallet.findUnique({
          where: { userId: listing.currentBidderId! },
        });
        const sellerWallet = await tx.wallet.findUnique({
          where: { userId: listing.sellerId },
        });
        if (
          !buyerWallet ||
          !sellerWallet ||
          Number(buyerWallet.balanceMasheleni) < Number(listing.currentBid)
        ) {
          throw new Error('insufficient funds at close');
        }
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balanceMasheleni: { decrement: listing.currentBid } },
        });
        await tx.wallet.update({
          where: { id: sellerWallet.id },
          data: { balanceMasheleni: { increment: listing.currentBid } },
        });
        await tx.transaction.create({
          data: {
            walletId: buyerWallet.id,
            type: 'PAYMENT',
            status: 'SUCCESS',
            amount: -listing.currentBid,
          },
        });
        await tx.transaction.create({
          data: {
            walletId: sellerWallet.id,
            type: 'RECEIVE',
            status: 'SUCCESS',
            amount: listing.currentBid,
          },
        });
        const sold = await tx.marketplaceListing.update({
          where: { id: listing.id },
          data: {
            status: 'SOLD',
            buyerId: listing.currentBidderId!,
            soldAt: new Date(),
          },
        });
        await tx.invoice.create({
          data: {
            invoiceNumber: this.generateInvoiceNumber(),
            listingId: sold.id,
            buyerId: listing.currentBidderId!,
            sellerId: listing.sellerId,
            itemTitle: sold.title,
            amount: Number(listing.currentBid),
          },
        });
        return sold;
      });

      await this.notifications.create(
        listing.currentBidderId!,
        'marketplace.auction_won',
        'You won the auction!',
        `Your bid won "${sold.title}"`,
        { listingId: listing.id, amount: Number(listing.currentBid) },
      );
      await this.notifications.create(
        listing.sellerId,
        'marketplace.item_sold',
        'Your item sold!',
        `"${sold.title}" sold at auction for ${Number(listing.currentBid)} MSH`,
        { listingId: listing.id, amount: Number(listing.currentBid) },
      );
    } catch {
      await this.prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: { status: 'EXPIRED' },
      });
    }
  }
}
