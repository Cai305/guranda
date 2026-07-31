import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';

const dayMs = 24 * 60 * 60 * 1000;
const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / dayMs);

@Injectable()
export class TravelService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
  ) {}

  private getRouteStackHeaders(): Record<string, string> {
    const apiKey = process.env.ROUTESTACK_API_KEY;
    if (!apiKey) return {};
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private resolveCityCode(location?: string): string {
    if (!location) return 'JNB';
    const loc = location.toLowerCase().trim();
    if (loc.length === 3) return loc.toUpperCase();
    if (loc.includes('cape')) return 'CPT';
    if (loc.includes('joburg') || loc.includes('johannesburg')) return 'JNB';
    if (loc.includes('london')) return 'LON';
    if (loc.includes('paris')) return 'PAR';
    if (loc.includes('new york')) return 'NYC';
    return 'JNB';
  }

  // ── Stays ────────────────────────────────────────────────────────────────
  async listStays(filter?: { location?: string }) {
    const headers = this.getRouteStackHeaders();
    if (headers['Authorization']) {
      try {
        const cityCode = this.resolveCityCode(filter?.location);
        const baseUrl =
          process.env.ROUTESTACK_API_URL || 'https://api.routestack.ai';
        const res = await fetch(
          `${baseUrl}/v1/hotels/search?cityCode=${cityCode}`,
          { headers },
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.hotels) && data.hotels.length > 0) {
            return data.hotels.slice(0, 10).map((h: any) => ({
              id: `routestack-stay-${h.id}`,
              hostId: null,
              title: h.name || 'Premium Hotel',
              description:
                h.description ||
                'Luxury accommodation fetched dynamically from RouteStack Travel API.',
              location: h.address || `${cityCode} City Center`,
              pricePerNight:
                h.pricePerNight || 120 + Math.floor(Math.random() * 80),
              maxGuests: h.maxGuests || 4,
              amenities: h.amenities || [
                'Wifi',
                'Air Conditioning',
                'Pool',
                'Breakfast Included',
              ],
              imageUrl:
                h.imageUrl ||
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop',
              rating: h.rating || 4.5,
              isActive: true,
              host: null,
            }));
          }
        }
      } catch (err) {
        console.warn(
          '[RouteStack API] Failed to fetch stays, falling back to local DB',
          err,
        );
      }
    }

    return this.prisma.travelStay.findMany({
      where: {
        isActive: true,
        ...(filter?.location
          ? { location: { contains: filter.location, mode: 'insensitive' } }
          : {}),
      },
      include: {
        host: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async getStay(id: string) {
    if (id.startsWith('routestack-stay-')) {
      return {
        id,
        hostId: null,
        title: 'RouteStack Premium Stay',
        description:
          'Luxury accommodation fetched dynamically from RouteStack Travel API.',
        location: 'JNB',
        pricePerNight: 150,
        maxGuests: 4,
        amenities: ['Wifi', 'Air Conditioning', 'Pool', 'Breakfast Included'],
        imageUrl:
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop',
        rating: 4.8,
        isActive: true,
        host: null,
      };
    }

    const stay = await this.prisma.travelStay.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, username: true, profile: true } },
      },
    });
    if (!stay) throw new NotFoundException('Stay not found');
    return stay;
  }

  async getMyStays(hostId: string) {
    return this.prisma.travelStay.findMany({
      where: { hostId },
      include: { bookings: { orderBy: { checkIn: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStay(hostId: string, dto: any) {
    await this.verificationService.assertVerified(hostId, 'Listing a stay');
    if (!dto.title || !dto.location || !(Number(dto.pricePerNight) > 0)) {
      throw new BadRequestException(
        'Title, location and a positive nightly price are required',
      );
    }
    return this.prisma.travelStay.create({
      data: {
        hostId,
        title: dto.title,
        description: dto.description || null,
        location: dto.location,
        pricePerNight: Number(dto.pricePerNight),
        maxGuests: Number(dto.maxGuests) || 2,
        amenities: Array.isArray(dto.amenities) ? dto.amenities : [],
        imageUrl: dto.imageUrl || null,
      },
    });
  }

  async updateStay(hostId: string, id: string, dto: any) {
    const stay = await this.prisma.travelStay.findUnique({ where: { id } });
    if (!stay) throw new NotFoundException('Stay not found');
    if (stay.hostId !== hostId) throw new ForbiddenException();
    return this.prisma.travelStay.update({ where: { id }, data: dto });
  }

  async deleteStay(hostId: string, id: string) {
    const stay = await this.prisma.travelStay.findUnique({ where: { id } });
    if (!stay) throw new NotFoundException('Stay not found');
    if (stay.hostId !== hostId) throw new ForbiddenException();
    await this.prisma.travelStay.delete({ where: { id } });
    return { success: true };
  }

  async bookStay(
    guestId: string,
    dto: { stayId: string; checkIn: string; checkOut: string; guests?: number },
  ) {
    let stay = await this.prisma.travelStay.findUnique({
      where: { id: dto.stayId },
    });
    if (!stay && dto.stayId.startsWith('routestack-stay-')) {
      stay = await this.prisma.travelStay.create({
        data: {
          id: dto.stayId,
          hostId: guestId,
          title: 'RouteStack Premium Stay Booking',
          location: 'JNB',
          pricePerNight: 150,
          maxGuests: 4,
          isActive: true,
        },
      });
    }

    if (!stay || !stay.isActive) throw new NotFoundException('Stay not found');

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    if (
      isNaN(checkIn.getTime()) ||
      isNaN(checkOut.getTime()) ||
      checkOut <= checkIn
    ) {
      throw new BadRequestException('Invalid check-in/check-out dates');
    }
    const nights = daysBetween(checkIn, checkOut);
    const guests = Number(dto.guests) || 1;
    if (guests > stay.maxGuests)
      throw new BadRequestException(
        `This stay sleeps up to ${stay.maxGuests} guests`,
      );

    const overlapping = await this.prisma.travelStayBooking.findFirst({
      where: {
        stayId: dto.stayId,
        status: 'CONFIRMED',
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (overlapping)
      throw new BadRequestException(
        'Those dates are already booked for this stay',
      );

    const totalPrice = parseFloat((stay.pricePerNight * nights).toFixed(2));
    return this.payAndBook({
      guestId,
      hostId: stay.hostId === guestId ? null : stay.hostId,
      totalPrice,
      create: () =>
        this.prisma.travelStayBooking.create({
          data: {
            stayId: dto.stayId,
            guestId,
            checkIn,
            checkOut,
            guests,
            nights,
            totalPrice,
          },
        }),
    });
  }

  // ── Car Hire ─────────────────────────────────────────────────────────────
  async listCars(filter?: { category?: string; location?: string }) {
    const headers = this.getRouteStackHeaders();
    if (headers['Authorization']) {
      try {
        const cityCode = this.resolveCityCode(filter?.location);
        const baseUrl =
          process.env.ROUTESTACK_API_URL || 'https://api.routestack.ai';
        const res = await fetch(
          `${baseUrl}/v1/cars/search?locationCode=${cityCode}`,
          { headers },
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.cars) && data.cars.length > 0) {
            return data.cars.slice(0, 10).map((c: any) => ({
              id: `routestack-car-${c.id}`,
              hostId: null,
              make: c.make || 'Premium Car',
              model: c.model || 'Rental',
              category: c.category || 'Sedan',
              location: cityCode,
              pricePerDay: c.pricePerDay || 45 + Math.floor(Math.random() * 25),
              imageUrl: c.imageUrl || null,
              rating: c.rating || 4.5,
              isActive: true,
              host: null,
            }));
          }
        }
      } catch (err) {
        console.warn(
          '[RouteStack API] Failed to fetch cars, falling back to local DB',
          err,
        );
      }
    }

    return this.prisma.travelCar.findMany({
      where: {
        isActive: true,
        ...(filter?.category ? { category: filter.category } : {}),
        ...(filter?.location
          ? { location: { contains: filter.location, mode: 'insensitive' } }
          : {}),
      },
      include: {
        host: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async getCar(id: string) {
    if (id.startsWith('routestack-car-')) {
      return {
        id,
        hostId: null,
        make: 'RouteStack Car',
        model: 'Rental',
        category: 'Economy',
        location: 'JNB',
        pricePerDay: 50,
        rating: 4.8,
        isActive: true,
        host: null,
      };
    }

    const car = await this.prisma.travelCar.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, username: true, profile: true } },
      },
    });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  async getMyCars(hostId: string) {
    return this.prisma.travelCar.findMany({
      where: { hostId },
      include: { bookings: { orderBy: { pickupDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCar(hostId: string, dto: any) {
    await this.verificationService.assertVerified(
      hostId,
      'Listing a car for hire',
    );
    if (
      !dto.make ||
      !dto.model ||
      !dto.location ||
      !(Number(dto.pricePerDay) > 0)
    ) {
      throw new BadRequestException(
        'Make, model, location and a positive daily price are required',
      );
    }
    return this.prisma.travelCar.create({
      data: {
        hostId,
        make: dto.make,
        model: dto.model,
        category: dto.category || 'Economy',
        location: dto.location,
        pricePerDay: Number(dto.pricePerDay),
        imageUrl: dto.imageUrl || null,
      },
    });
  }

  async updateCar(hostId: string, id: string, dto: any) {
    const car = await this.prisma.travelCar.findUnique({ where: { id } });
    if (!car) throw new NotFoundException('Car not found');
    if (car.hostId !== hostId) throw new ForbiddenException();
    return this.prisma.travelCar.update({ where: { id }, data: dto });
  }

  async deleteCar(hostId: string, id: string) {
    const car = await this.prisma.travelCar.findUnique({ where: { id } });
    if (!car) throw new NotFoundException('Car not found');
    if (car.hostId !== hostId) throw new ForbiddenException();
    await this.prisma.travelCar.delete({ where: { id } });
    return { success: true };
  }

  async bookCar(
    guestId: string,
    dto: { carId: string; pickupDate: string; returnDate: string },
  ) {
    let car = await this.prisma.travelCar.findUnique({
      where: { id: dto.carId },
    });
    if (!car && dto.carId.startsWith('routestack-car-')) {
      car = await this.prisma.travelCar.create({
        data: {
          id: dto.carId,
          hostId: guestId,
          make: 'RouteStack',
          model: 'Car Rental',
          category: 'Economy',
          location: 'JNB',
          pricePerDay: 50,
          isActive: true,
        },
      });
    }

    if (!car || !car.isActive) throw new NotFoundException('Car not found');

    const pickupDate = new Date(dto.pickupDate);
    const returnDate = new Date(dto.returnDate);
    if (
      isNaN(pickupDate.getTime()) ||
      isNaN(returnDate.getTime()) ||
      returnDate <= pickupDate
    ) {
      throw new BadRequestException('Invalid pickup/return dates');
    }
    const days = daysBetween(pickupDate, returnDate);

    const overlapping = await this.prisma.travelCarBooking.findFirst({
      where: {
        carId: dto.carId,
        status: 'CONFIRMED',
        pickupDate: { lt: returnDate },
        returnDate: { gt: pickupDate },
      },
    });
    if (overlapping)
      throw new BadRequestException(
        'This car is already booked for those dates',
      );

    const totalPrice = parseFloat((car.pricePerDay * days).toFixed(2));
    return this.payAndBook({
      guestId,
      hostId: car.hostId === guestId ? null : car.hostId,
      totalPrice,
      create: () =>
        this.prisma.travelCarBooking.create({
          data: {
            carId: dto.carId,
            guestId,
            pickupDate,
            returnDate,
            days,
            totalPrice,
          },
        }),
    });
  }

  // ── Flights ──────────────────────────────────────────────────────────────
  async listFlights(filter?: { origin?: string; destination?: string }) {
    const headers = this.getRouteStackHeaders();
    if (headers['Authorization']) {
      try {
        const origin = this.resolveCityCode(filter?.origin);
        const destination =
          this.resolveCityCode(filter?.destination) === 'JNB' &&
          origin === 'JNB'
            ? 'CPT'
            : this.resolveCityCode(filter?.destination);
        const today = new Date();
        const departureDate = new Date(today.getTime() + 14 * dayMs)
          .toISOString()
          .slice(0, 10);

        const baseUrl =
          process.env.ROUTESTACK_API_URL || 'https://api.routestack.ai';
        const res = await fetch(
          `${baseUrl}/v1/flights/search?origin=${origin}&destination=${destination}&departureDate=${departureDate}`,
          { headers },
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.flights) && data.flights.length > 0) {
            return data.flights.map((f: any) => ({
              id: `routestack-flight-${f.id}`,
              airline: f.airline || 'SA',
              flightNumber: f.flightNumber || '101',
              origin: f.origin || origin,
              destination: f.destination || destination,
              departureTime: f.departureTime
                ? new Date(f.departureTime)
                : new Date(today.getTime() + 14 * dayMs),
              arrivalTime: f.arrivalTime
                ? new Date(f.arrivalTime)
                : new Date(today.getTime() + 14 * dayMs + 2 * 60 * 60 * 1000),
              price: Math.round(f.price || 150),
              seatsAvailable: f.seatsAvailable ?? 9,
            }));
          }
        }
      } catch (err) {
        console.warn(
          '[RouteStack API] Failed to fetch flights, falling back to local DB',
          err,
        );
      }
    }

    return this.prisma.travelFlight.findMany({
      where: {
        seatsAvailable: { gt: 0 },
        departureTime: { gt: new Date() },
        ...(filter?.origin
          ? { origin: { contains: filter.origin, mode: 'insensitive' } }
          : {}),
        ...(filter?.destination
          ? {
              destination: {
                contains: filter.destination,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: { departureTime: 'asc' },
    });
  }

  async getFlight(id: string) {
    if (id.startsWith('routestack-flight-')) {
      return {
        id,
        airline: 'RouteStack Airline',
        flightNumber: '101',
        origin: 'JNB',
        destination: 'CPT',
        departureTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        arrivalTime: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
        ),
        price: 150,
        seatsAvailable: 99,
      };
    }

    const flight = await this.prisma.travelFlight.findUnique({ where: { id } });
    if (!flight) throw new NotFoundException('Flight not found');
    return flight;
  }

  async bookFlight(
    userId: string,
    dto: { flightId: string; passengers?: number },
  ) {
    let flight = await this.prisma.travelFlight.findUnique({
      where: { id: dto.flightId },
    });
    if (!flight && dto.flightId.startsWith('routestack-flight-')) {
      flight = await this.prisma.travelFlight.create({
        data: {
          id: dto.flightId,
          airline: 'RouteStack Airline',
          flightNumber: '101',
          origin: 'JNB',
          destination: 'CPT',
          departureTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          arrivalTime: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
          ),
          price: 150,
          seatsAvailable: 99,
        },
      });
    }

    if (!flight) throw new NotFoundException('Flight not found');
    const passengers = Number(dto.passengers) || 1;
    if (flight.seatsAvailable < passengers)
      throw new BadRequestException('Not enough seats available');

    const totalPrice = parseFloat((flight.price * passengers).toFixed(2));
    return this.payAndBook({
      guestId: userId,
      hostId: null,
      totalPrice,
      create: () =>
        this.prisma.travelFlightBooking.create({
          data: { flightId: dto.flightId, userId, passengers, totalPrice },
        }),
      extra: [
        this.prisma.travelFlight.update({
          where: { id: dto.flightId },
          data: { seatsAvailable: { decrement: passengers } },
        }),
      ],
    });
  }

  // ── Holiday Packages ────────────────────────────────────────────────────
  async listPackages(filter?: { destination?: string }) {
    return this.prisma.travelPackage.findMany({
      where: filter?.destination
        ? { destination: { contains: filter.destination, mode: 'insensitive' } }
        : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPackage(id: string) {
    const pkg = await this.prisma.travelPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async bookPackage(
    userId: string,
    dto: { packageId: string; travelers?: number },
  ) {
    const pkg = await this.prisma.travelPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    const travelers = Number(dto.travelers) || 1;
    const totalPrice = parseFloat((pkg.price * travelers).toFixed(2));
    return this.payAndBook({
      guestId: userId,
      hostId: null,
      totalPrice,
      create: () =>
        this.prisma.travelPackageBooking.create({
          data: { packageId: dto.packageId, userId, travelers, totalPrice },
        }),
    });
  }

  // ── My Trips (unified across all 4 verticals) ───────────────────────────
  async myTrips(userId: string) {
    const [stays, cars, flights, packages] = await Promise.all([
      this.prisma.travelStayBooking.findMany({
        where: { guestId: userId },
        include: { stay: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.travelCarBooking.findMany({
        where: { guestId: userId },
        include: { car: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.travelFlightBooking.findMany({
        where: { userId },
        include: { flight: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.travelPackageBooking.findMany({
        where: { userId },
        include: { package: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const trips = [
      ...stays.map((b) => ({
        type: 'stay' as const,
        id: b.id,
        title: b.stay.title,
        subtitle: b.stay.location,
        dateLabel: `${b.checkIn.toISOString().slice(0, 10)} → ${b.checkOut.toISOString().slice(0, 10)}`,
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
      ...cars.map((b) => ({
        type: 'car' as const,
        id: b.id,
        title: `${b.car.make} ${b.car.model}`,
        subtitle: b.car.location,
        dateLabel: `${b.pickupDate.toISOString().slice(0, 10)} → ${b.returnDate.toISOString().slice(0, 10)}`,
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
      ...flights.map((b) => ({
        type: 'flight' as const,
        id: b.id,
        title: `${b.flight.origin} → ${b.flight.destination}`,
        subtitle: `${b.flight.airline} ${b.flight.flightNumber}`,
        dateLabel: b.flight.departureTime.toISOString().slice(0, 10),
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
      ...packages.map((b) => ({
        type: 'package' as const,
        id: b.id,
        title: b.package.title,
        subtitle: b.package.destination,
        dateLabel: `${b.package.durationDays} days`,
        totalPrice: b.totalPrice,
        status: b.status,
        createdAt: b.createdAt,
      })),
    ];

    return trips.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ── Shared wallet debit/credit for a booking ────────────────────────────
  private async payAndBook(opts: {
    guestId: string;
    hostId: string | null;
    totalPrice: number;
    create: () => any;
    extra?: any[];
  }) {
    const guestWallet = await this.prisma.wallet.findUnique({
      where: { userId: opts.guestId },
    });
    if (!guestWallet) throw new BadRequestException('No wallet found');
    if (guestWallet.balanceMasheleni < opts.totalPrice)
      throw new BadRequestException('Insufficient MSH balance');

    const ops: any[] = [
      opts.create(),
      this.prisma.wallet.update({
        where: { userId: opts.guestId },
        data: { balanceMasheleni: { decrement: opts.totalPrice } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: guestWallet.id,
          amount: -opts.totalPrice,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
    ];

    if (opts.hostId) {
      const hostWallet = await this.prisma.wallet.findUnique({
        where: { userId: opts.hostId },
      });
      if (hostWallet) {
        ops.push(
          this.prisma.wallet.update({
            where: { userId: opts.hostId },
            data: { balanceMasheleni: { increment: opts.totalPrice } },
          }),
          this.prisma.transaction.create({
            data: {
              walletId: hostWallet.id,
              amount: opts.totalPrice,
              type: 'RECEIVE',
              status: 'SUCCESS',
            },
          }),
        );
      }
    }

    if (opts.extra) ops.push(...opts.extra);

    const [booking] = await this.prisma.$transaction(ops);
    return booking;
  }
}
