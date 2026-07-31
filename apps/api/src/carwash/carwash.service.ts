import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
}
