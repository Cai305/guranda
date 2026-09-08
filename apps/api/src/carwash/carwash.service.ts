import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CarwashService {
  constructor(private prisma: PrismaService) {}

  async listCarWashes() {
    return this.prisma.carWash.findMany({
      include: {
        services: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCarWash(id: string) {
    const cw = await this.prisma.carWash.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!cw) throw new NotFoundException('Car wash not found');
    return cw;
  }

  async createCarWash(ownerId: string, data: any) {
    return this.prisma.carWash.create({
      data: {
        ownerId,
        name: data.name,
        description: data.description,
        address: data.address,
        services: {
          create: data.services?.map((s: any) => ({
            name: s.name,
            description: s.description,
            price: Number(s.price),
          })) || [],
        },
      },
      include: { services: true },
    });
  }

  async myCarWashes(userId: string) {
    return this.prisma.carWash.findMany({
      where: { ownerId: userId },
      include: {
        services: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Was missing entirely — no way for an owner to see bookings ACROSS their
  // car washes (getMyBookings above is the customer-side, filtered to
  // userId). Mirrors HairService.getMyProfile's include-bookings shape.
  async myBookingsAsOwner(userId: string) {
    return this.prisma.carWashBooking.findMany({
      where: { carWash: { ownerId: userId } },
      include: {
        carWash: { select: { id: true, name: true } },
        service: { select: { name: true } },
        user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCarWash(id: string, userId: string, data: any) {
    const cw = await this.prisma.carWash.findUnique({ where: { id } });
    if (!cw) throw new NotFoundException('Car wash not found');
    if (cw.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.carWash.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.isOpen !== undefined ? { isOpen: !!data.isOpen } : {}),
      },
      include: { services: true },
    });
  }

  async deleteCarWash(id: string, userId: string) {
    const cw = await this.prisma.carWash.findUnique({ where: { id } });
    if (!cw) throw new NotFoundException('Car wash not found');
    if (cw.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.carWash.delete({ where: { id } });
    return { success: true };
  }

  async bookCarWash(userId: string, data: { carWashId: string; serviceId: string; scheduledFor?: string }) {
    const service = await this.prisma.carWashService.findUnique({
      where: { id: data.serviceId },
    });
    if (!service || service.carWashId !== data.carWashId) {
      throw new BadRequestException('Invalid service');
    }

    return this.prisma.carWashBooking.create({
      data: {
        userId,
        carWashId: data.carWashId,
        serviceId: data.serviceId,
        totalAmount: service.price,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      },
    });
  }

  async getMyBookings(userId: string) {
    return this.prisma.carWashBooking.findMany({
      where: { userId },
      include: { carWash: true, service: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Was entirely missing — a carwash booking had no way to ever leave
  // PENDING. Mirrors HairService.updateBookingStatus's exact pattern
  // (owner-only, status allowlist).
  async updateBookingStatus(
    userId: string,
    bookingId: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
  ) {
    const booking = await this.prisma.carWashBooking.findUnique({
      where: { id: bookingId },
      include: { carWash: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.carWash.ownerId !== userId) throw new ForbiddenException('Not your booking');
    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.prisma.carWashBooking.update({
      where: { id: bookingId },
      data: { status },
    });
  }
}
