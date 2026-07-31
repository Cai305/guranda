import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class HairService {
  constructor(private prisma: PrismaService) {}

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

    let totalPrice = service.price;

    if (data.purchasedItemsIds && data.purchasedItemsIds.length > 0) {
      const products = await this.prisma.hairProduct.findMany({
        where: { id: { in: data.purchasedItemsIds } },
      });
      totalPrice += products.reduce((acc: number, p: any) => acc + p.price, 0);
    }

    return this.prisma.hairBooking.create({
      data: {
        customerId: userId,
        hairdresserId: data.hairdresserId,
        serviceId: data.serviceId,
        appointmentAt: new Date(data.appointmentAt),
        purchasedItemsIds: data.purchasedItemsIds || [],
        totalPrice,
      },
    });
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
