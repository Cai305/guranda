import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class HairService {
  constructor(private prisma: PrismaService) {}

  // ── Owner CRUD — the hairdresser managing their own salon ──────────────

  async getMyProfile(userId: string) {
    return this.prisma.hairdresserProfile.findUnique({
      where: { userId },
      include: {
        services: true,
        products: true,
        bookings: {
          orderBy: { appointmentAt: 'desc' },
          include: {
            customer: { select: { id: true, username: true, profile: true } },
            service: { select: { title: true } },
          },
        },
      },
    });
  }

  async createMyProfile(
    userId: string,
    data: {
      businessName: string;
      bio?: string;
      lat: number;
      lng: number;
      address?: string;
    },
  ) {
    if (!data.businessName?.trim()) {
      throw new BadRequestException('businessName is required');
    }
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      throw new BadRequestException('lat and lng are required');
    }
    const existing = await this.prisma.hairdresserProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('You already have a salon profile');
    }
    return this.prisma.hairdresserProfile.create({
      data: {
        userId,
        businessName: data.businessName.trim(),
        bio: data.bio ?? null,
        lat: data.lat,
        lng: data.lng,
        address: data.address ?? null,
      },
    });
  }

  async updateMyProfile(
    userId: string,
    data: Partial<{
      businessName: string;
      bio: string | null;
      lat: number;
      lng: number;
      address: string | null;
    }>,
  ) {
    const profile = await this.prisma.hairdresserProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('You have no salon profile yet');
    if (data.businessName !== undefined && !data.businessName.trim()) {
      throw new BadRequestException('businessName cannot be empty');
    }
    return this.prisma.hairdresserProfile.update({
      where: { userId },
      data: {
        ...(data.businessName !== undefined && { businessName: data.businessName.trim() }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.lat !== undefined && { lat: data.lat }),
        ...(data.lng !== undefined && { lng: data.lng }),
        ...(data.address !== undefined && { address: data.address }),
      },
    });
  }

  private async assertOwnsProfile(userId: string) {
    const profile = await this.prisma.hairdresserProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('You have no salon profile yet');
    return profile;
  }

  async addService(
    userId: string,
    data: { title: string; description?: string; price: number; duration: number; images?: string[] },
  ) {
    const profile = await this.assertOwnsProfile(userId);
    if (!data.title?.trim()) throw new BadRequestException('title is required');
    if (!(data.price > 0)) throw new BadRequestException('price must be greater than 0');
    if (!(data.duration > 0)) throw new BadRequestException('duration must be greater than 0');
    return this.prisma.hairService.create({
      data: {
        hairdresserId: profile.id,
        title: data.title.trim(),
        description: data.description ?? null,
        price: data.price,
        duration: data.duration,
        images: data.images ?? [],
      },
    });
  }

  async updateService(
    userId: string,
    serviceId: string,
    data: Partial<{ title: string; description: string | null; price: number; duration: number; images: string[] }>,
  ) {
    const profile = await this.assertOwnsProfile(userId);
    const service = await this.prisma.hairService.findUnique({ where: { id: serviceId } });
    if (!service || service.hairdresserId !== profile.id) {
      throw new ForbiddenException('Not your service');
    }
    return this.prisma.hairService.update({
      where: { id: serviceId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.images !== undefined && { images: data.images }),
      },
    });
  }

  async deleteService(userId: string, serviceId: string) {
    const profile = await this.assertOwnsProfile(userId);
    const service = await this.prisma.hairService.findUnique({ where: { id: serviceId } });
    if (!service || service.hairdresserId !== profile.id) {
      throw new ForbiddenException('Not your service');
    }
    await this.prisma.hairService.delete({ where: { id: serviceId } });
    return { success: true };
  }

  async addProduct(
    userId: string,
    data: { name: string; description?: string; price: number; imageUrl?: string; inStock?: boolean },
  ) {
    const profile = await this.assertOwnsProfile(userId);
    if (!data.name?.trim()) throw new BadRequestException('name is required');
    if (!(data.price > 0)) throw new BadRequestException('price must be greater than 0');
    return this.prisma.hairProduct.create({
      data: {
        hairdresserId: profile.id,
        name: data.name.trim(),
        description: data.description ?? null,
        price: data.price,
        imageUrl: data.imageUrl ?? null,
        inStock: data.inStock ?? true,
      },
    });
  }

  async updateProduct(
    userId: string,
    productId: string,
    data: Partial<{ name: string; description: string | null; price: number; imageUrl: string | null; inStock: boolean }>,
  ) {
    const profile = await this.assertOwnsProfile(userId);
    const product = await this.prisma.hairProduct.findUnique({ where: { id: productId } });
    if (!product || product.hairdresserId !== profile.id) {
      throw new ForbiddenException('Not your product');
    }
    return this.prisma.hairProduct.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.inStock !== undefined && { inStock: data.inStock }),
      },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const profile = await this.assertOwnsProfile(userId);
    const product = await this.prisma.hairProduct.findUnique({ where: { id: productId } });
    if (!product || product.hairdresserId !== profile.id) {
      throw new ForbiddenException('Not your product');
    }
    await this.prisma.hairProduct.delete({ where: { id: productId } });
    return { success: true };
  }

  async updateBookingStatus(
    userId: string,
    bookingId: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
  ) {
    const profile = await this.assertOwnsProfile(userId);
    const booking = await this.prisma.hairBooking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.hairdresserId !== profile.id) {
      throw new ForbiddenException('Not your booking');
    }
    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.prisma.hairBooking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  async searchHairdressers(
    lat: number,
    lng: number,
    radiusKm: number,
    query?: string,
  ) {
    let dressers = await this.prisma.hairdresserProfile.findMany({
      include: {
        services: true,
        user: { select: { id: true, username: true, profile: true } },
      },
    });

    if (query) {
      const q = query.toLowerCase();
      dressers = dressers.filter(
        (d: any) =>
          d.businessName.toLowerCase().includes(q) ||
          d.services.some((s: any) => s.title.toLowerCase().includes(q)),
      );
    }

    if (lat && lng) {
      dressers = dressers.filter((d: any) => {
        const distance = this.getDistanceFromLatLonInKm(lat, lng, d.lat, d.lng);
        return distance <= radiusKm;
      });
    }

    return dressers.map((d: any) => ({
      ...d,
      displayName: d.user?.profile?.displayName || d.user?.username,
      avatarUrl: d.user?.profile?.avatarUrl,
    }));
  }

  async getHairdresserById(id: string) {
    const profile = await this.prisma.hairdresserProfile.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            requiredItems: true,
          },
        },
        products: true,
        user: {
          select: { username: true, profile: true },
        },
      },
    });

    if (!profile) throw new NotFoundException('Hairdresser not found');

    return {
      ...profile,
      displayName: profile.user?.profile?.displayName || profile.user?.username,
      avatarUrl: profile.user?.profile?.avatarUrl,
    };
  }

  async createBooking(
    userId: string,
    data: {
      hairdresserId: string;
      serviceId: string;
      appointmentAt: string;
      purchasedItemsIds: string[];
    },
  ) {
    const service = await this.prisma.hairService.findUnique({
      where: { id: data.serviceId },
    });
    if (!service) throw new NotFoundException('Service not found');

    const hairdresser = await this.prisma.hairdresserProfile.findUnique({
      where: { id: data.hairdresserId },
    });
    if (!hairdresser) throw new NotFoundException('Salon not found');
    if (hairdresser.userId === userId) {
      throw new BadRequestException("You can't book your own salon");
    }

    let totalPrice = service.price;

    if (data.purchasedItemsIds && data.purchasedItemsIds.length > 0) {
      const products = await this.prisma.hairProduct.findMany({
        where: { id: { in: data.purchasedItemsIds } },
      });
      totalPrice += products.reduce((acc: number, p: any) => acc + p.price, 0);
    }

    // Same up-front pay-and-book pattern as health appointments
    // (HealthAppService.bookAppointment) — the customer's wallet is
    // debited and the salon owner's credited immediately, atomically with
    // the booking row, rather than leaving it unpaid until some later step.
    const customerWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!customerWallet) throw new BadRequestException('No wallet found');
    if (customerWallet.balanceMasheleni < totalPrice) {
      throw new BadRequestException('Insufficient MSH balance');
    }
    const ownerWallet = await this.prisma.wallet.findUnique({
      where: { userId: hairdresser.userId },
    });
    if (!ownerWallet) throw new BadRequestException('Salon wallet not found');

    const [booking] = await this.prisma.$transaction([
      this.prisma.hairBooking.create({
        data: {
          customerId: userId,
          hairdresserId: data.hairdresserId,
          serviceId: data.serviceId,
          appointmentAt: new Date(data.appointmentAt),
          purchasedItemsIds: data.purchasedItemsIds || [],
          totalPrice,
        },
      }),
      this.prisma.wallet.update({
        where: { userId },
        data: { balanceMasheleni: { decrement: totalPrice } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: customerWallet.id,
          amount: -totalPrice,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.wallet.update({
        where: { userId: hairdresser.userId },
        data: { balanceMasheleni: { increment: totalPrice } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: ownerWallet.id,
          amount: totalPrice,
          type: 'RECEIVE',
          status: 'SUCCESS',
        },
      }),
    ]);
    return booking;
  }

  async seedTestHairdresser() {
    // Check if one already exists
    let profile = await this.prisma.hairdresserProfile.findFirst();
    if (profile) return { message: 'Already seeded', profile };

    // Find a user or create one
    let user = await this.prisma.user.findFirst({
      where: { username: 'test_hairdresser' },
    });
    if (!user) {
      // This account is a seeded demo profile, never meant to be logged
      // into — but the column is still `passwordHash`, so it still needs a
      // real bcrypt hash rather than a literal placeholder string (the
      // original 'dummy' value was flagged in a prior security review).
      // Hashing an unguessable random value keeps the login path uniform
      // (bcrypt.compare never throws on a malformed hash) without creating
      // a usable credential for anyone.
      const randomPassword = randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await this.prisma.user.create({
        data: {
          username: 'test_hairdresser',
          passwordHash,
          profile: {
            create: {
              displayName: 'Jessica Braids & Beauty',
              avatarUrl:
                'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&w=200&q=80',
            },
          },
        },
      });
    }

    profile = await this.prisma.hairdresserProfile.create({
      data: {
        userId: user.id,
        businessName: 'Jessica Braids & Beauty',
        bio: 'Professional braider with 10 years of experience. I specialize in box braids and cornrows.',
        lat: -26.2041, // JHB lat
        lng: 28.0473, // JHB lng
        address: '123 Braamfontein St, Johannesburg',
        rating: 4.8,
      },
    });

    // Create a product
    const product = await this.prisma.hairProduct.create({
      data: {
        hairdresserId: profile.id,
        name: 'X-Pression Ultra Braid (Color 1)',
        description: 'High quality synthetic hair for braiding.',
        price: 85.0,
        imageUrl:
          'https://images.unsplash.com/photo-1614777826358-16478950d7e6?auto=format&fit=crop&w=300&q=80',
        inStock: true,
      },
    });

    // Create a service
    await this.prisma.hairService.create({
      data: {
        hairdresserId: profile.id,
        title: 'Knotless Box Braids (Medium)',
        description:
          'Pain-free knotless box braids. Includes wash and blow dry.',
        price: 550.0,
        duration: 180,
        images: [
          'https://images.unsplash.com/photo-1605389025068-d01f8072120e?auto=format&fit=crop&w=300&q=80',
        ],
        requiredItems: {
          connect: { id: product.id },
        },
      },
    });

    return { message: 'Seeded successfully', profileId: profile.id };
  }

  private getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }
}
