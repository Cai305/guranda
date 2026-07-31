import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// CarFind: a car classifieds mini app modeled on carfind.co.za. Sellers list
// a car with specs and photos; buyers browse/filter and send an enquiry.
// No in-app payment for the vehicle — buyer and seller connect and complete
// the sale outside the app, same as the real site.
@Injectable()
export class CarFindService {
  constructor(private prisma: PrismaService) {}

  async createListing(sellerId: string, dto: any) {
    if (
      !dto.title ||
      !dto.make ||
      !dto.model ||
      !dto.year ||
      !(Number(dto.price) > 0) ||
      !dto.location
    ) {
      throw new BadRequestException(
        'Title, make, model, year, price and location are required',
      );
    }
    const images: string[] = Array.isArray(dto.images)
      ? dto.images.filter(Boolean)
      : [];
    if (images.length < 3) {
      throw new BadRequestException(
        `Every listing needs at least 3 pictures — you provided ${images.length}`,
      );
    }
    return this.prisma.carListing.create({
      data: {
        sellerId,
        title: dto.title,
        make: dto.make,
        model: dto.model,
        year: Number(dto.year),
        price: Number(dto.price),
        mileage: Number(dto.mileage) || 0,
        transmission: dto.transmission || 'MANUAL',
        fuelType: dto.fuelType || 'PETROL',
        bodyType: dto.bodyType || 'SEDAN',
        condition: dto.condition || 'USED',
        location: dto.location,
        description: dto.description || null,
        images,
      },
    });
  }

  async updateListing(sellerId: string, id: string, dto: any) {
    const listing = await this.prisma.carListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) throw new ForbiddenException();
    return this.prisma.carListing.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.price !== undefined ? { price: Number(dto.price) } : {}),
        ...(dto.mileage !== undefined ? { mileage: Number(dto.mileage) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.images !== undefined ? { images: dto.images } : {}),
        ...(dto.sold !== undefined ? { sold: !!dto.sold } : {}),
      },
    });
  }

  async deleteListing(sellerId: string, id: string) {
    const listing = await this.prisma.carListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) throw new ForbiddenException();
    await this.prisma.carListing.delete({ where: { id } });
    return { success: true };
  }

  async browse(filter?: {
    make?: string;
    model?: string;
    location?: string;
    bodyType?: string;
    fuelType?: string;
    transmission?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    maxMileage?: number;
  }) {
    return this.prisma.carListing.findMany({
      where: {
        sold: false,
        ...(filter?.make
          ? { make: { contains: filter.make, mode: 'insensitive' } }
          : {}),
        ...(filter?.model
          ? { model: { contains: filter.model, mode: 'insensitive' } }
          : {}),
        ...(filter?.location
          ? { location: { contains: filter.location, mode: 'insensitive' } }
          : {}),
        ...(filter?.bodyType ? { bodyType: filter.bodyType } : {}),
        ...(filter?.fuelType ? { fuelType: filter.fuelType } : {}),
        ...(filter?.transmission ? { transmission: filter.transmission } : {}),
        ...(filter?.condition ? { condition: filter.condition } : {}),
        ...(filter?.minPrice
          ? { price: { gte: Number(filter.minPrice) } }
          : {}),
        ...(filter?.maxPrice
          ? { price: { lte: Number(filter.maxPrice) } }
          : {}),
        ...(filter?.maxMileage
          ? { mileage: { lte: Number(filter.maxMileage) } }
          : {}),
      },
      include: {
        seller: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getListing(id: string) {
    const listing = await this.prisma.carListing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, username: true, profile: true } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async myListings(sellerId: string) {
    return this.prisma.carListing.findMany({
      where: { sellerId },
      include: {
        enquiries: {
          include: {
            buyer: { select: { id: true, username: true, profile: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendEnquiry(buyerId: string, listingId: string, message: string) {
    const listing = await this.prisma.carListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId === buyerId)
      throw new BadRequestException("You can't enquire about your own listing");
    if (!message?.trim())
      throw new BadRequestException('Enquiry message is required');
    return this.prisma.carEnquiry.create({
      data: { listingId, buyerId, message: message.trim() },
    });
  }

  async myEnquiries(buyerId: string) {
    return this.prisma.carEnquiry.findMany({
      where: { buyerId },
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
