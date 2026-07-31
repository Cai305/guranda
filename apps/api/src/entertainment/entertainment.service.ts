import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// No ambiguous characters (0/O, 1/I/L) — these get typed by hand at the door.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(len: number): string {
  let code = '';
  for (let i = 0; i < len; i++)
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

@Injectable()
export class EntertainmentService {
  constructor(private prisma: PrismaService) {}

  // ── Movies ───────────────────────────────────────────────────────────────
  async listMovies(filter?: { genre?: string }) {
    return this.prisma.movie.findMany({
      where: filter?.genre
        ? { genre: { contains: filter.genre, mode: 'insensitive' } }
        : {},
      include: {
        showtimes: {
          where: { seatsAvailable: { gt: 0 }, startsAt: { gt: new Date() } },
          orderBy: { startsAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMovie(id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        showtimes: {
          where: { startsAt: { gt: new Date() } },
          orderBy: { startsAt: 'asc' },
        },
      },
    });
    if (!movie) throw new NotFoundException('Movie not found');
    return movie;
  }

  async bookMovieShowtime(
    userId: string,
    showtimeId: string,
    dto: { seats?: number },
  ) {
    const showtime = await this.prisma.movieShowtime.findUnique({
      where: { id: showtimeId },
    });
    if (!showtime) throw new NotFoundException('Showtime not found');
    const seats = Number(dto.seats) || 1;
    if (showtime.seatsAvailable < seats)
      throw new BadRequestException('Not enough seats available');

    const totalPrice = parseFloat((showtime.price * seats).toFixed(2));
    return this.payAndBook({
      userId,
      totalPrice,
      create: () =>
        this.prisma.movieBooking.create({
          data: { showtimeId, userId, seats, totalPrice },
        }),
      extra: [
        this.prisma.movieShowtime.update({
          where: { id: showtimeId },
          data: { seatsAvailable: { decrement: seats } },
        }),
      ],
    });
  }

  // ── Music / Concerts ────────────────────────────────────────────────────
  async listConcerts(filter?: { city?: string }) {
    return this.prisma.concert.findMany({
      where: {
        ticketsAvailable: { gt: 0 },
        startsAt: { gt: new Date() },
        ...(filter?.city
          ? { city: { contains: filter.city, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async getConcert(id: string) {
    const concert = await this.prisma.concert.findUnique({ where: { id } });
    if (!concert) throw new NotFoundException('Concert not found');
    return concert;
  }

  async bookConcert(
    userId: string,
    concertId: string,
    dto: { tickets?: number },
  ) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
    });
    if (!concert) throw new NotFoundException('Concert not found');
    const tickets = Number(dto.tickets) || 1;
    if (concert.ticketsAvailable < tickets)
      throw new BadRequestException('Not enough tickets available');

    const totalPrice = parseFloat((concert.price * tickets).toFixed(2));
    return this.payAndBook({
      userId,
      totalPrice,
      create: () =>
        this.prisma.concertBooking.create({
          data: { concertId, userId, tickets, totalPrice },
        }),
      extra: [
        this.prisma.concert.update({
          where: { id: concertId },
          data: { ticketsAvailable: { decrement: tickets } },
        }),
      ],
    });
  }

  // ── Live Events (comedy, theatre, sports, festivals) ────────────────────
  // Open, any-user-hosted (like Eat/Shopping) — organizerId is null for the
  // platform-curated/seeded events, set for user-created ones.
  async listEvents(filter?: { category?: string; city?: string }) {
    return this.prisma.eventListing.findMany({
      where: {
        ticketsAvailable: { gt: 0 },
        startsAt: { gt: new Date() },
        ...(filter?.category ? { category: filter.category } : {}),
        ...(filter?.city
          ? { city: { contains: filter.city, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async getEvent(id: string) {
    const event = await this.prisma.eventListing.findUnique({
      where: { id },
      include: { organizer: { select: { id: true, username: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async createEvent(userId: string, dto: any) {
    if (
      !dto.title ||
      !dto.venue ||
      !dto.city ||
      !dto.startsAt ||
      !(Number(dto.price) >= 0)
    ) {
      throw new BadRequestException(
        'Title, venue, city, start time and a price are required',
      );
    }
    const ticketsTotal = Math.max(1, Number(dto.ticketsTotal) || 100);
    return this.prisma.eventListing.create({
      data: {
        organizerId: userId,
        title: dto.title,
        category: dto.category || 'Festival',
        venue: dto.venue,
        city: dto.city,
        startsAt: new Date(dto.startsAt),
        posterUrl: dto.posterUrl || null,
        description: dto.description || null,
        price: Number(dto.price),
        ticketsTotal,
        ticketsAvailable: ticketsTotal,
      },
    });
  }

  async updateEvent(userId: string, eventId: string, dto: any) {
    await this.assertCanManage(eventId, userId);
    const data: any = {};
    (
      [
        'title',
        'category',
        'venue',
        'city',
        'posterUrl',
        'description',
      ] as const
    ).forEach((k) => {
      if (dto[k] !== undefined) data[k] = dto[k];
    });
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.price !== undefined) data.price = Number(dto.price);
    return this.prisma.eventListing.update({ where: { id: eventId }, data });
  }

  async deleteEvent(userId: string, eventId: string) {
    await this.assertIsOrganizer(eventId, userId);
    const bookingsCount = await this.prisma.eventBooking.count({
      where: { eventId },
    });
    if (bookingsCount > 0)
      throw new BadRequestException(
        'Cannot delete an event that already has ticket sales',
      );
    await this.prisma.eventManager.deleteMany({ where: { eventId } });
    await this.prisma.eventScanner.deleteMany({ where: { eventId } });
    await this.prisma.eventListing.delete({ where: { id: eventId } });
    return { success: true };
  }

  async myEvents(userId: string) {
    const [organized, managed, scanned] = await Promise.all([
      this.prisma.eventListing.findMany({
        where: { organizerId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eventManager.findMany({
        where: { userId },
        include: { event: true },
      }),
      this.prisma.eventScanner.findMany({
        where: { userId },
        include: { event: true },
      }),
    ]);
    const seen = new Set(organized.map((e) => e.id));
    const dedupe = (events: typeof organized) =>
      events.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
    const managedEvents = dedupe(managed.map((m) => m.event));
    const scannedEvents = dedupe(scanned.map((s) => s.event));
    return [
      ...organized.map((e) => ({ ...e, myRole: 'ORGANIZER' as const })),
      ...managedEvents.map((e) => ({ ...e, myRole: 'CO_MANAGER' as const })),
      ...scannedEvents.map((e) => ({ ...e, myRole: 'SCANNER' as const })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async bookEvent(userId: string, eventId: string, dto: { tickets?: number }) {
    const event = await this.prisma.eventListing.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    const tickets = Number(dto.tickets) || 1;
    if (event.ticketsAvailable < tickets)
      throw new BadRequestException('Not enough tickets available');

    const totalPrice = parseFloat((event.price * tickets).toFixed(2));
    return this.payAndBook({
      userId,
      totalPrice,
      create: () =>
        this.prisma.eventBooking.create({
          data: {
            eventId,
            userId,
            tickets,
            totalPrice,
            ticketItems: {
              create: Array.from({ length: tickets }, () => ({
                code: generateCode(8),
              })),
            },
          },
          include: { ticketItems: true },
        }),
      extra: [
        this.prisma.eventListing.update({
          where: { id: eventId },
          data: { ticketsAvailable: { decrement: tickets } },
        }),
      ],
    });
  }

  async myTicketsForBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.eventBooking.findUnique({
      where: { id: bookingId },
      include: { ticketItems: true, event: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException();
    return booking;
  }

  // ── Team: co-managers (full edit rights) + scanners (check-in only) ────
  private async assertIsOrganizer(eventId: string, userId: string) {
    const event = await this.prisma.eventListing.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== userId)
      throw new ForbiddenException('Only the organizer can do this');
    return event;
  }

  private async assertCanManage(eventId: string, userId: string) {
    const event = await this.prisma.eventListing.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId === userId) return event;
    const isCoManager = await this.prisma.eventManager.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!isCoManager)
      throw new ForbiddenException('You do not manage this event');
    return event;
  }

  private async assertCanScan(eventId: string, userId: string) {
    const event = await this.prisma.eventListing.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId === userId) return event;
    const [isManager, isScanner] = await Promise.all([
      this.prisma.eventManager.findUnique({
        where: { eventId_userId: { eventId, userId } },
      }),
      this.prisma.eventScanner.findUnique({
        where: { eventId_userId: { eventId, userId } },
      }),
    ]);
    if (!isManager && !isScanner)
      throw new ForbiddenException("You are not on this event's team");
    return event;
  }

  async getTeam(userId: string, eventId: string) {
    await this.assertCanScan(eventId, userId);
    const event = await this.prisma.eventListing.findUnique({
      where: { id: eventId },
      include: {
        organizer: { select: { id: true, username: true } },
        managers: {
          include: { user: { select: { id: true, username: true } } },
        },
        scanners: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return {
      organizer: event.organizer,
      managers: event.managers.map((m) => m.user),
      scanners: event.scanners.map((s) => s.user),
      managerInviteCode: event.managerInviteCode,
      scannerInviteCode: event.scannerInviteCode,
    };
  }

  async addCoManager(actorId: string, eventId: string, username: string) {
    await this.assertIsOrganizer(eventId, actorId);
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === actorId)
      throw new BadRequestException('You already organize this event');
    const existing = await this.prisma.eventManager.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (existing) throw new BadRequestException('Already a co-manager');
    await this.prisma.eventManager.create({
      data: { eventId, userId: user.id },
    });
    return { success: true };
  }

  async removeCoManager(
    actorId: string,
    eventId: string,
    targetUserId: string,
  ) {
    await this.assertIsOrganizer(eventId, actorId);
    await this.prisma.eventManager.deleteMany({
      where: { eventId, userId: targetUserId },
    });
    return { success: true };
  }

  async addScanner(actorId: string, eventId: string, username: string) {
    await this.assertCanManage(eventId, actorId);
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    const existing = await this.prisma.eventScanner.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (existing) throw new BadRequestException('Already a scanner');
    await this.prisma.eventScanner.create({
      data: { eventId, userId: user.id },
    });
    return { success: true };
  }

  async removeScanner(actorId: string, eventId: string, targetUserId: string) {
    await this.assertCanManage(eventId, actorId);
    await this.prisma.eventScanner.deleteMany({
      where: { eventId, userId: targetUserId },
    });
    return { success: true };
  }

  async regenerateInviteCode(
    actorId: string,
    eventId: string,
    type: 'manager' | 'scanner',
  ) {
    await this.assertIsOrganizer(eventId, actorId);
    const code = generateCode(10);
    const field =
      type === 'manager' ? 'managerInviteCode' : 'scannerInviteCode';
    await this.prisma.eventListing.update({
      where: { id: eventId },
      data: { [field]: code },
    });
    return { code };
  }

  // Matched purely by code — the invitee doesn't need to know the eventId,
  // just the code shared with them (managerInviteCode/scannerInviteCode are
  // each globally unique so the lookup is unambiguous).
  async redeemInviteCode(userId: string, code: string) {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) throw new BadRequestException('Enter an invite code');
    const event = await this.prisma.eventListing.findFirst({
      where: {
        OR: [{ managerInviteCode: trimmed }, { scannerInviteCode: trimmed }],
      },
    });
    if (!event) throw new NotFoundException('Invalid invite code');
    if (event.organizerId === userId)
      throw new BadRequestException('You already organize this event');

    if (event.managerInviteCode === trimmed) {
      const existing = await this.prisma.eventManager.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
      });
      if (existing)
        throw new BadRequestException(
          'You are already a co-manager of this event',
        );
      await this.prisma.eventManager.create({
        data: { eventId: event.id, userId },
      });
      return { role: 'CO_MANAGER', event };
    }
    const existing = await this.prisma.eventScanner.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } },
    });
    if (existing)
      throw new BadRequestException('You are already a scanner for this event');
    await this.prisma.eventScanner.create({
      data: { eventId: event.id, userId },
    });
    return { role: 'SCANNER', event };
  }

  // ── Ticket check-in ──────────────────────────────────────────────────────
  async verifyTicket(scannerId: string, eventId: string, code: string) {
    await this.assertCanScan(eventId, scannerId);
    const trimmed = (code || '').trim().toUpperCase();
    const ticket = await this.prisma.eventTicket.findUnique({
      where: { code: trimmed },
      include: {
        booking: { include: { user: { select: { username: true } } } },
      },
    });
    if (!ticket || ticket.booking.eventId !== eventId) {
      throw new NotFoundException('Ticket not found for this event');
    }
    if (ticket.checkedIn) {
      return {
        valid: false,
        alreadyUsed: true,
        checkedInAt: ticket.checkedInAt,
        holder: ticket.booking.user.username,
      };
    }
    await this.prisma.eventTicket.update({
      where: { id: ticket.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: scannerId,
      },
    });
    return {
      valid: true,
      alreadyUsed: false,
      holder: ticket.booking.user.username,
    };
  }

  async eventTicketStats(userId: string, eventId: string) {
    await this.assertCanScan(eventId, userId);
    const [sold, checkedIn] = await Promise.all([
      this.prisma.eventTicket.count({ where: { booking: { eventId } } }),
      this.prisma.eventTicket.count({
        where: { booking: { eventId }, checkedIn: true },
      }),
    ]);
    return { sold, checkedIn };
  }

  // ── My Bookings (unified across all 3 verticals) ────────────────────────
  async myBookings(userId: string) {
    const [movies, concerts, events] = await Promise.all([
      this.prisma.movieBooking.findMany({
        where: { userId },
        include: { showtime: { include: { movie: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.concertBooking.findMany({
        where: { userId },
        include: { concert: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eventBooking.findMany({
        where: { userId },
        include: { event: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const bookings = [
      ...movies.map((b) => ({
        type: 'movie' as const,
        id: b.id,
        title: b.showtime.movie.title,
        subtitle: `${b.showtime.cinema} · ${b.seats} seat${b.seats > 1 ? 's' : ''}`,
        dateLabel: b.showtime.startsAt.toISOString(),
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
      ...concerts.map((b) => ({
        type: 'concert' as const,
        id: b.id,
        title: b.concert.title,
        subtitle: `${b.concert.venue} · ${b.tickets} ticket${b.tickets > 1 ? 's' : ''}`,
        dateLabel: b.concert.startsAt.toISOString(),
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
      ...events.map((b) => ({
        type: 'event' as const,
        id: b.id,
        title: b.event.title,
        subtitle: `${b.event.venue} · ${b.tickets} ticket${b.tickets > 1 ? 's' : ''}`,
        dateLabel: b.event.startsAt.toISOString(),
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
    ];

    return bookings.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // ── Shared wallet debit for a booking (curated catalog, no host payout) ─
  private async payAndBook(opts: {
    userId: string;
    totalPrice: number;
    create: () => any;
    extra?: any[];
  }) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: opts.userId },
    });
    if (!wallet) throw new BadRequestException('No wallet found');
    if (wallet.balanceMasheleni < opts.totalPrice)
      throw new BadRequestException('Insufficient MSH balance');

    const ops: any[] = [
      opts.create(),
      this.prisma.wallet.update({
        where: { userId: opts.userId },
        data: { balanceMasheleni: { decrement: opts.totalPrice } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -opts.totalPrice,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
    ];
    if (opts.extra) ops.push(...opts.extra);

    const [booking] = await this.prisma.$transaction(ops);
    return booking;
  }
}
