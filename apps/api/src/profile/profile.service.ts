import { BadRequestException, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { getDisplayedReputation, nextLevelThreshold, levelLadder } from '../users/reputation.util';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Four narrated pillars (Reputation/Growth/Rank/Impact) — each a real,
   * already-tracked signal, not an invented number. Reputation/Rank reuse
   * the existing username-snapshot reputation system; Growth reuses the
   * Challenges XP already on UserProfile; Impact composes challenges
   * completed + gifts received, the same two fields snapshotted below so
   * the "this week" delta stays consistent with what's actually stored.
   */
  async computePillars(userId: string) {
    const [{ live, subscribers, reputation, level }, profile, challengesCompleted] = await Promise.all([
      getDisplayedReputation(this.prisma, userId),
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.challengeEntry.count({ where: { userId } }),
    ]);

    const xp = profile?.xp ?? 0;
    const giftsReceived = live.giftsReceived;
    const impactValue = challengesCompleted * 10 + giftsReceived * 2;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snapshot = await this.prisma.profileMetricsSnapshot.findFirst({
      where: { userId, capturedAt: { lte: weekAgo } },
      orderBy: { capturedAt: 'desc' },
    });
    const snapshotImpact = snapshot ? snapshot.challengesCompleted * 10 + snapshot.giftsReceived * 2 : null;
    const next = nextLevelThreshold(subscribers);

    return {
      reputation: {
        value: Math.round(reputation),
        deltaWeek: snapshot ? Math.round(reputation - snapshot.reputation) : null,
      },
      growth: {
        xp,
        deltaWeek: snapshot ? xp - snapshot.xp : null,
      },
      rank: {
        level,
        subscribers: Math.round(subscribers),
        nextLevel: next?.nextLevel ?? null,
        subscribersNeeded: next ? Math.max(0, Math.round(next.subscribersNeeded)) : null,
        ladder: levelLadder(),
      },
      impact: {
        value: impactValue,
        deltaWeek: snapshotImpact !== null ? impactValue - snapshotImpact : null,
      },
    };
  }

  // The companion's stage IS the reputation ladder position (Nano/Micro/
  // Midtier/Macro/Mega Influencer), not a separate counter — growing your
  // reputation visibly grows your pet, instead of the two being unrelated.
  async getCompanion(userId: string) {
    const { subscribers, level } = await getDisplayedReputation(this.prisma, userId);
    const ladder = levelLadder();
    const stage = Math.max(0, ladder.findIndex((t) => t.level === level));
    const next = nextLevelThreshold(subscribers);

    const companion = await this.prisma.companion.upsert({
      where: { userId },
      create: { userId, stage },
      // Keep stage in sync with the reputation ladder on every read — cheap
      // since this only ever moves forward (reputation doesn't decrease).
      update: stage > 0 ? { stage, lastEvolvedAt: new Date() } : {},
    });

    return {
      ...companion,
      stage,
      level,
      subscribersIntoStage: Math.max(0, Math.round(subscribers - ladder[stage].min)),
      subscribersForNextStage: next ? Math.max(0, Math.round(next.subscribersNeeded)) : null,
    };
  }

  async renameCompanion(userId: string, name: string) {
    const trimmed = (name || '').trim().slice(0, 24);
    if (!trimmed) throw new BadRequestException('Give your companion a name.');
    await this.prisma.companion.upsert({
      where: { userId },
      create: { userId, name: trimmed },
      update: { name: trimmed },
    });
    return this.getCompanion(userId);
  }

  async listMyBadges(userId: string) {
    const [owned, allBadges] = await Promise.all([
      this.prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { mintedAt: 'desc' },
      }),
      this.prisma.badge.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    const ownedIds = new Set(owned.map((o) => o.badgeId));
    return {
      owned: owned.map((o) => ({ ...o.badge, mintedAt: o.mintedAt })),
      locked: allBadges.filter((b) => !ownedIds.has(b.id)),
    };
  }

  async getHQ(userId: string) {
    const [pillars, companion, badges] = await Promise.all([
      this.computePillars(userId),
      this.getCompanion(userId),
      this.listMyBadges(userId),
    ]);
    return { pillars, companion, badges };
  }

  /**
   * "My Bookings" — Profile's real cross-mini-app view of what the user has
   * upcoming. Bookings live in 9 separate, mini-app-owned tables (Travel's
   * four, Hair, Movie, Concert, Event, Carwash) with no shared parent table,
   * so this fans out one filtered query per table and merges the results in
   * app code rather than trying to force a single query across them.
   */
  async getMyBookings(userId: string) {
    const now = new Date();
    type BookingItem = { id: string; kind: string; title: string; subtitle: string; when: string | null; amount: number; status: string };

    const [stays, cars, flights, packages, hair, movies, concerts, events, carwashes] = await Promise.all([
      this.prisma.travelStayBooking.findMany({
        where: { guestId: userId, status: { not: 'CANCELLED' }, checkIn: { gte: now } },
        include: { stay: { select: { title: true, location: true } } },
        orderBy: { checkIn: 'asc' },
        take: 10,
      }),
      this.prisma.travelCarBooking.findMany({
        where: { guestId: userId, status: { not: 'CANCELLED' }, pickupDate: { gte: now } },
        include: { car: { select: { make: true, model: true, location: true } } },
        orderBy: { pickupDate: 'asc' },
        take: 10,
      }),
      this.prisma.travelFlightBooking.findMany({
        where: { userId, status: { not: 'CANCELLED' }, flight: { departureTime: { gte: now } } },
        include: { flight: { select: { airline: true, flightNumber: true, origin: true, destination: true, departureTime: true } } },
        orderBy: { flight: { departureTime: 'asc' } },
        take: 10,
      }),
      this.prisma.travelPackageBooking.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        include: { package: { select: { title: true, destination: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.hairBooking.findMany({
        where: { customerId: userId, status: { notIn: ['CANCELLED', 'COMPLETED'] }, appointmentAt: { gte: now } },
        include: { hairdresser: { select: { businessName: true } }, service: { select: { title: true } } },
        orderBy: { appointmentAt: 'asc' },
        take: 10,
      }),
      this.prisma.movieBooking.findMany({
        where: { userId, status: { not: 'CANCELLED' }, showtime: { startsAt: { gte: now } } },
        include: { showtime: { select: { startsAt: true, cinema: true, movie: { select: { title: true } } } } },
        orderBy: { showtime: { startsAt: 'asc' } },
        take: 10,
      }),
      this.prisma.concertBooking.findMany({
        where: { userId, status: { not: 'CANCELLED' }, concert: { startsAt: { gte: now } } },
        include: { concert: { select: { title: true, artist: true, venue: true, startsAt: true } } },
        orderBy: { concert: { startsAt: 'asc' } },
        take: 10,
      }),
      this.prisma.eventBooking.findMany({
        where: { userId, status: { not: 'CANCELLED' }, event: { startsAt: { gte: now } } },
        include: { event: { select: { title: true, venue: true, startsAt: true } } },
        orderBy: { event: { startsAt: 'asc' } },
        take: 10,
      }),
      this.prisma.carWashBooking.findMany({
        where: { userId, status: { notIn: ['CANCELLED', 'COMPLETED'] }, scheduledFor: { gte: now } },
        include: { carWash: { select: { name: true } }, service: { select: { name: true } } },
        orderBy: { scheduledFor: 'asc' },
        take: 10,
      }),
    ]);

    const items: BookingItem[] = [
      ...stays.map((b) => ({
        id: b.id, kind: 'stay', title: b.stay.title, subtitle: b.stay.location,
        when: b.checkIn.toISOString(), amount: b.totalPrice, status: b.status,
      })),
      ...cars.map((b) => ({
        id: b.id, kind: 'car', title: `${b.car.make} ${b.car.model}`, subtitle: b.car.location,
        when: b.pickupDate.toISOString(), amount: b.totalPrice, status: b.status,
      })),
      ...flights.map((b) => ({
        id: b.id, kind: 'flight', title: `${b.flight.airline} ${b.flight.flightNumber}`,
        subtitle: `${b.flight.origin} → ${b.flight.destination}`,
        when: b.flight.departureTime.toISOString(), amount: b.totalPrice, status: b.status,
      })),
      ...packages.map((b) => ({
        id: b.id, kind: 'package', title: b.package.title, subtitle: b.package.destination,
        when: null, amount: b.totalPrice, status: b.status,
      })),
      ...hair.map((b) => ({
        id: b.id, kind: 'hair', title: b.service.title, subtitle: b.hairdresser.businessName,
        when: b.appointmentAt.toISOString(), amount: b.totalPrice, status: b.status,
      })),
      ...movies.map((b) => ({
        id: b.id, kind: 'movie', title: b.showtime.movie.title, subtitle: b.showtime.cinema,
        when: b.showtime.startsAt.toISOString(), amount: b.totalPrice, status: b.status,
      })),
      ...concerts.map((b) => ({
        id: b.id, kind: 'concert', title: `${b.concert.artist} — ${b.concert.title}`, subtitle: b.concert.venue,
        when: b.concert.startsAt.toISOString(), amount: b.totalPrice, status: b.status,
      })),
      ...events.map((b) => ({
        id: b.id, kind: 'event', title: b.event.title, subtitle: b.event.venue,
        when: b.event.startsAt.toISOString(), amount: b.totalPrice, status: b.status,
      })),
      ...carwashes.map((b) => ({
        id: b.id, kind: 'carwash', title: b.service.name, subtitle: b.carWash.name,
        when: b.scheduledFor ? b.scheduledFor.toISOString() : null, amount: b.totalAmount, status: b.status,
      })),
    ];

    // Undated items (a package booking with no fixed date yet) sort after
    // every dated one instead of before, so "what's coming up soonest" stays
    // the natural reading order.
    items.sort((a, b) => {
      if (a.when === null && b.when === null) return 0;
      if (a.when === null) return 1;
      if (b.when === null) return -1;
      return a.when.localeCompare(b.when);
    });

    return items.slice(0, 20);
  }

  // Runs once a day so pillar cards can diff against "the value ~7 days
  // ago" — same pattern as the CCR/daily-challenge crons elsewhere.
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async writeSnapshotsForActiveUsers() {
    // "Active" = touched something in the last 30 days — no point snapshotting
    // fully dormant accounts every day forever.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUserIds = await this.prisma.post.findMany({
      where: { createdAt: { gte: since } },
      distinct: ['authorId'],
      select: { authorId: true },
      take: 5000,
    });
    const ids = [...new Set(recentUserIds.map((r) => r.authorId))];

    for (const userId of ids) {
      const [{ live, reputation, subscribers }, profile, challengesCompleted] = await Promise.all([
        getDisplayedReputation(this.prisma, userId),
        this.prisma.userProfile.findUnique({ where: { userId } }),
        this.prisma.challengeEntry.count({ where: { userId } }),
      ]);
      await this.prisma.profileMetricsSnapshot.create({
        data: {
          userId,
          reputation,
          subscribers,
          xp: profile?.xp ?? 0,
          challengesCompleted,
          giftsReceived: live.giftsReceived,
        },
      });
    }
    return { snapshotted: ids.length };
  }
}
