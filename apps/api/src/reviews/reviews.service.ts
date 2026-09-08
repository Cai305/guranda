import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type TransactionType =
  | 'eat_order'
  | 'shopping_order'
  | 'hair_booking'
  | 'carwash_booking'
  | 'travel_stay'
  | 'travel_car';

const TRANSACTION_TYPES: TransactionType[] = [
  'eat_order',
  'shopping_order',
  'hair_booking',
  'carwash_booking',
  'travel_stay',
  'travel_car',
];

interface ResolvedTransaction {
  reviewerId: string;
  sellerId: string;
  listingId: string;
  completed: boolean;
}

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * The one place that knows how to find "who bought this, who sold it,
   * which listing, is it actually done" for each of the 6 real mini-app
   * transaction types that have both an individual seller and a genuine
   * completion event. Property, Flight and Package are deliberately
   * absent — no individual seller (Flight/Package: curated catalog) or no
   * completion event (Property: an open-ended lease, never closed) to
   * hang a review on.
   */
  private async resolveTransaction(
    type: TransactionType,
    transactionId: string,
  ): Promise<ResolvedTransaction | null> {
    switch (type) {
      case 'eat_order': {
        const order = await this.prisma.eatOrder.findUnique({
          where: { id: transactionId },
          include: { store: true },
        });
        if (!order) return null;
        return { reviewerId: order.customerId, sellerId: order.store.ownerId, listingId: order.storeId, completed: order.status === 'DELIVERED' };
      }
      case 'shopping_order': {
        const order = await this.prisma.shoppingOrder.findUnique({
          where: { id: transactionId },
          include: { store: true },
        });
        if (!order) return null;
        return { reviewerId: order.customerId, sellerId: order.store.ownerId, listingId: order.storeId, completed: order.status === 'DELIVERED' };
      }
      case 'hair_booking': {
        const booking = await this.prisma.hairBooking.findUnique({
          where: { id: transactionId },
          include: { hairdresser: true },
        });
        if (!booking) return null;
        return { reviewerId: booking.customerId, sellerId: booking.hairdresser.userId, listingId: booking.hairdresserId, completed: booking.status === 'COMPLETED' };
      }
      case 'carwash_booking': {
        const booking = await this.prisma.carWashBooking.findUnique({
          where: { id: transactionId },
          include: { carWash: true },
        });
        if (!booking) return null;
        return { reviewerId: booking.userId, sellerId: booking.carWash.ownerId, listingId: booking.carWashId, completed: booking.status === 'COMPLETED' };
      }
      case 'travel_stay': {
        const booking = await this.prisma.travelStayBooking.findUnique({
          where: { id: transactionId },
          include: { stay: true },
        });
        if (!booking) return null;
        return { reviewerId: booking.guestId, sellerId: booking.stay.hostId, listingId: booking.stayId, completed: booking.status === 'COMPLETED' };
      }
      case 'travel_car': {
        const booking = await this.prisma.travelCarBooking.findUnique({
          where: { id: transactionId },
          include: { car: true },
        });
        if (!booking) return null;
        return { reviewerId: booking.guestId, sellerId: booking.car.hostId, listingId: booking.carId, completed: booking.status === 'COMPLETED' };
      }
      default:
        return null;
    }
  }

  // Recomputes one listing's real average and writes it back to the
  // already-existing `rating` column that model has always had (EatStore,
  // ShoppingStore, HairdresserProfile, CarWash, TravelStay, TravelCar all
  // default it to 0 and never write it anywhere) — 9 real customer-facing
  // screens already read this field and were showing a permanent fake 0
  // or a stale seed value. This makes those screens real with no changes
  // to them at all.
  private async syncListingRating(type: TransactionType, listingId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { transactionType: type, listingId },
      _avg: { rating: true },
    });
    const rating = agg._avg.rating ?? 0;
    switch (type) {
      case 'eat_order':
        return this.prisma.eatStore.update({ where: { id: listingId }, data: { rating } });
      case 'shopping_order':
        return this.prisma.shoppingStore.update({ where: { id: listingId }, data: { rating } });
      case 'hair_booking':
        return this.prisma.hairdresserProfile.update({ where: { id: listingId }, data: { rating } });
      case 'carwash_booking':
        return this.prisma.carWash.update({ where: { id: listingId }, data: { rating } });
      case 'travel_stay':
        return this.prisma.travelStay.update({ where: { id: listingId }, data: { rating } });
      case 'travel_car':
        return this.prisma.travelCar.update({ where: { id: listingId }, data: { rating } });
    }
  }

  async submitReview(
    reviewerId: string,
    type: TransactionType,
    transactionId: string,
    rating: number,
    comment?: string,
  ) {
    if (!TRANSACTION_TYPES.includes(type)) {
      throw new BadRequestException('Unknown transaction type');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be a whole number from 1 to 5');
    }
    const resolved = await this.resolveTransaction(type, transactionId);
    if (!resolved) throw new NotFoundException('Transaction not found');
    if (resolved.reviewerId !== reviewerId) {
      throw new ForbiddenException('You can only review your own transactions');
    }
    if (!resolved.completed) {
      throw new BadRequestException('This can only be reviewed once completed');
    }

    let review;
    try {
      review = await this.prisma.review.create({
        data: {
          reviewerId,
          sellerId: resolved.sellerId,
          listingId: resolved.listingId,
          rating,
          comment: comment?.trim() || null,
          transactionType: type,
          transactionId,
        },
      });
    } catch {
      // @@unique([transactionType, transactionId]) violation — already reviewed.
      throw new BadRequestException('You already reviewed this');
    }
    await this.syncListingRating(type, resolved.listingId);
    return review;
  }

  async checkReview(type: TransactionType, transactionId: string) {
    const review = await this.prisma.review.findUnique({
      where: { transactionType_transactionId: { transactionType: type, transactionId } },
    });
    return { reviewed: !!review, review };
  }

  async listForSeller(sellerId: string) {
    return this.prisma.review.findMany({
      where: { sellerId },
      include: { reviewer: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Business Reputation (product decision, 2026-09): a real combination of
   * customer ratings AND a reliability signal, not an invented number.
   * Reliability = completion rate across every real transaction type this
   * seller has — COMPLETED-equivalent vs COMPLETED+CANCELLED, excluding
   * still-pending ones (those aren't failures, just unresolved yet).
   * With zero reviews yet, the score is reliability alone rather than
   * dragging a fresh seller down with a fake 0-star average.
   */
  async getReputation(sellerId: string) {
    const [ratingAgg, eat, shopping, hair, carwash, stay, car] = await Promise.all([
      this.prisma.review.aggregate({ where: { sellerId }, _avg: { rating: true }, _count: true }),
      this.prisma.eatOrder.groupBy({ by: ['status'], where: { store: { ownerId: sellerId } }, _count: true }),
      this.prisma.shoppingOrder.groupBy({ by: ['status'], where: { store: { ownerId: sellerId } }, _count: true }),
      this.prisma.hairBooking.groupBy({ by: ['status'], where: { hairdresser: { userId: sellerId } }, _count: true }),
      this.prisma.carWashBooking.groupBy({ by: ['status'], where: { carWash: { ownerId: sellerId } }, _count: true }),
      this.prisma.travelStayBooking.groupBy({ by: ['status'], where: { stay: { hostId: sellerId } }, _count: true }),
      this.prisma.travelCarBooking.groupBy({ by: ['status'], where: { car: { hostId: sellerId } }, _count: true }),
    ]);

    const countOf = (rows: { status: string; _count: number }[], status: string) =>
      rows.find((r) => r.status === status)?._count ?? 0;

    const completed =
      countOf(eat, 'DELIVERED') +
      countOf(shopping, 'DELIVERED') +
      countOf(hair, 'COMPLETED') +
      countOf(carwash, 'COMPLETED') +
      countOf(stay, 'COMPLETED') +
      countOf(car, 'COMPLETED');
    const cancelled =
      countOf(eat, 'CANCELLED') +
      countOf(shopping, 'CANCELLED') +
      countOf(hair, 'CANCELLED') +
      countOf(carwash, 'CANCELLED') +
      countOf(stay, 'CANCELLED') +
      countOf(car, 'CANCELLED');
    const resolvedCount = completed + cancelled;
    const completionRate = resolvedCount > 0 ? Math.round((completed / resolvedCount) * 100) : null;

    const avgRating = ratingAgg._avg.rating;
    const reviewCount = ratingAgg._count;

    // Blend: 60% rating (scaled 1-5 -> 0-100), 40% reliability — only once
    // there's at least one review; before that, reliability alone (when
    // there's any resolved transaction) or null (nothing to score yet).
    let score: number | null = null;
    if (avgRating !== null && completionRate !== null) {
      score = Math.round(((avgRating - 1) / 4) * 100 * 0.6 + completionRate * 0.4);
    } else if (avgRating !== null) {
      score = Math.round(((avgRating - 1) / 4) * 100);
    } else if (completionRate !== null) {
      score = completionRate;
    }

    return {
      score,
      avgRating,
      reviewCount,
      completionRate,
      completedCount: completed,
      cancelledCount: cancelled,
    };
  }
}
