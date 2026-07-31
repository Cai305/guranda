import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const VALID_LOG_TYPES = ['workout', 'weight', 'steps', 'water'];

@Injectable()
export class HealthAppService {
  constructor(private prisma: PrismaService) {}

  // ── Fitness tracking (personal, no marketplace) ─────────────────────────
  async addFitnessLog(userId: string, dto: any) {
    if (!VALID_LOG_TYPES.includes(dto.type))
      throw new BadRequestException('Invalid log type');
    if (!(Number(dto.value) > 0))
      throw new BadRequestException('Enter a positive value');
    if (!dto.unit) throw new BadRequestException('A unit is required');
    return this.prisma.healthFitnessLog.create({
      data: {
        userId,
        type: dto.type,
        value: Number(dto.value),
        unit: dto.unit,
        note: dto.note || null,
        loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : new Date(),
      },
    });
  }

  async getMyFitnessLogs(userId: string, type?: string) {
    return this.prisma.healthFitnessLog.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { loggedAt: 'desc' },
      take: 200,
    });
  }

  async deleteFitnessLog(userId: string, id: string) {
    const log = await this.prisma.healthFitnessLog.findUnique({
      where: { id },
    });
    if (!log) throw new NotFoundException('Log not found');
    if (log.userId !== userId) throw new ForbiddenException();
    await this.prisma.healthFitnessLog.delete({ where: { id } });
    return { success: true };
  }

  async getFitnessSummary(userId: string) {
    const logs = await this.prisma.healthFitnessLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
    });
    const byType = (type: string) => logs.filter((l) => l.type === type);
    const workouts = byType('workout');
    const weights = byType('weight');
    const steps = byType('steps');
    const water = byType('water');
    return {
      workoutCount: workouts.length,
      workoutMinutesTotal: workouts.reduce((s, l) => s + l.value, 0),
      latestWeight: weights[0] || null,
      stepsToday: steps
        .filter((l) => isSameDay(l.loggedAt, new Date()))
        .reduce((s, l) => s + l.value, 0),
      waterTodayMl: water
        .filter((l) => isSameDay(l.loggedAt, new Date()))
        .reduce((s, l) => s + l.value, 0),
    };
  }

  // ── Doctor bookings ──────────────────────────────────────────────────────
  async registerPractitioner(userId: string, dto: any) {
    const existing = await this.prisma.healthPractitioner.findFirst({
      where: { ownerId: userId },
    });
    if (existing)
      throw new BadRequestException('You already have a practitioner profile');
    if (!dto.name || !dto.specialty || !(Number(dto.consultationFee) > 0)) {
      throw new BadRequestException(
        'Name, specialty and a positive consultation fee are required',
      );
    }
    return this.prisma.healthPractitioner.create({
      data: {
        ownerId: userId,
        name: dto.name,
        specialty: dto.specialty,
        bio: dto.bio || null,
        consultationFee: Number(dto.consultationFee),
        avatarUrl: dto.avatarUrl || null,
      },
    });
  }

  async listPractitioners(specialty?: string) {
    return this.prisma.healthPractitioner.findMany({
      where: specialty ? { specialty } : {},
      include: {
        owner: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPractitioner(id: string) {
    const p = await this.prisma.healthPractitioner.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
      },
    });
    if (!p) throw new NotFoundException('Practitioner not found');
    return p;
  }

  async getMyPractitioner(userId: string) {
    return this.prisma.healthPractitioner.findFirst({
      where: { ownerId: userId },
      include: { appointments: { orderBy: { scheduledAt: 'desc' } } },
    });
  }

  async updatePractitioner(userId: string, id: string, dto: any) {
    const p = await this.prisma.healthPractitioner.findUnique({
      where: { id },
    });
    if (!p) throw new NotFoundException('Practitioner not found');
    if (p.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.healthPractitioner.update({ where: { id }, data: dto });
  }

  async bookAppointment(
    patientId: string,
    practitionerId: string,
    dto: { scheduledAt: string; reason?: string },
  ) {
    const practitioner = await this.prisma.healthPractitioner.findUnique({
      where: { id: practitionerId },
    });
    if (!practitioner) throw new NotFoundException('Practitioner not found');
    if (practitioner.ownerId === patientId)
      throw new BadRequestException("You can't book your own practice");
    if (!dto.scheduledAt) throw new BadRequestException('Pick a date and time');
    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new BadRequestException('Pick a future date and time');
    }

    const clash = await this.prisma.healthAppointment.findFirst({
      where: { practitionerId, status: 'CONFIRMED', scheduledAt },
    });
    if (clash)
      throw new BadRequestException('That time slot is already booked');

    const fee = practitioner.consultationFee;
    const patientWallet = await this.prisma.wallet.findUnique({
      where: { userId: patientId },
    });
    if (!patientWallet) throw new BadRequestException('No wallet found');
    if (patientWallet.balanceMasheleni < fee)
      throw new BadRequestException('Insufficient MSH balance');
    const practitionerWallet = await this.prisma.wallet.findUnique({
      where: { userId: practitioner.ownerId },
    });
    if (!practitionerWallet)
      throw new BadRequestException('Practitioner wallet not found');

    const [appointment] = await this.prisma.$transaction([
      this.prisma.healthAppointment.create({
        data: {
          practitionerId,
          patientId,
          scheduledAt,
          reason: dto.reason || null,
          fee,
        },
        include: { practitioner: true },
      }),
      this.prisma.wallet.update({
        where: { userId: patientId },
        data: { balanceMasheleni: { decrement: fee } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: patientWallet.id,
          amount: -fee,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.wallet.update({
        where: { userId: practitioner.ownerId },
        data: { balanceMasheleni: { increment: fee } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: practitionerWallet.id,
          amount: fee,
          type: 'RECEIVE',
          status: 'SUCCESS',
        },
      }),
    ]);
    return appointment;
  }

  async getPractitionerAppointments(userId: string, practitionerId: string) {
    const practitioner = await this.prisma.healthPractitioner.findUnique({
      where: { id: practitionerId },
    });
    if (!practitioner) throw new NotFoundException('Practitioner not found');
    if (practitioner.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.healthAppointment.findMany({
      where: { practitionerId },
      include: {
        patient: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getMyAppointments(patientId: string) {
    return this.prisma.healthAppointment.findMany({
      where: { patientId },
      include: {
        practitioner: {
          select: { id: true, name: true, specialty: true, avatarUrl: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async updateAppointmentStatus(
    userId: string,
    appointmentId: string,
    status: string,
  ) {
    const VALID = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
    if (!VALID.includes(status))
      throw new BadRequestException('Invalid status');
    const appt = await this.prisma.healthAppointment.findUnique({
      where: { id: appointmentId },
      include: { practitioner: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.practitioner.ownerId !== userId && appt.patientId !== userId)
      throw new ForbiddenException();
    return this.prisma.healthAppointment.update({
      where: { id: appointmentId },
      data: { status },
    });
  }

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  async createPharmacy(userId: string, dto: any) {
    const existing = await this.prisma.healthPharmacy.findFirst({
      where: { ownerId: userId },
    });
    if (existing) throw new BadRequestException('You already have a pharmacy');
    if (!dto.name) throw new BadRequestException('Pharmacy name is required');
    return this.prisma.healthPharmacy.create({
      data: {
        ownerId: userId,
        name: dto.name,
        description: dto.description || null,
        address: dto.address || null,
        logoUrl: dto.logoUrl || null,
      },
    });
  }

  async listPharmacies() {
    return this.prisma.healthPharmacy.findMany({
      where: { isOpen: true },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
        _count: { select: { products: true } },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async getPharmacy(id: string) {
    const pharmacy = await this.prisma.healthPharmacy.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
        products: {
          where: { isAvailable: true },
          orderBy: { category: 'asc' },
        },
      },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    return pharmacy;
  }

  async getMyPharmacy(userId: string) {
    return this.prisma.healthPharmacy.findFirst({
      where: { ownerId: userId },
      include: { products: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async updatePharmacy(userId: string, id: string, dto: any) {
    const pharmacy = await this.prisma.healthPharmacy.findUnique({
      where: { id },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    if (pharmacy.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.healthPharmacy.update({ where: { id }, data: dto });
  }

  // ── Pharmacy products ────────────────────────────────────────────────────
  async listProducts(filters: { category?: string; search?: string }) {
    return this.prisma.healthPharmacyProduct.findMany({
      where: {
        isAvailable: true,
        pharmacy: { isOpen: true },
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      include: { pharmacy: { select: { id: true, name: true, rating: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async addProduct(userId: string, pharmacyId: string, dto: any) {
    const pharmacy = await this.prisma.healthPharmacy.findUnique({
      where: { id: pharmacyId },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    if (pharmacy.ownerId !== userId) throw new ForbiddenException();
    if (!dto.name || !(Number(dto.price) > 0))
      throw new BadRequestException('Name and a positive price are required');
    return this.prisma.healthPharmacyProduct.create({
      data: {
        pharmacyId,
        name: dto.name,
        description: dto.description || null,
        price: Number(dto.price),
        imageUrl: dto.imageUrl || null,
        category: dto.category || null,
        requiresPrescription: Boolean(dto.requiresPrescription),
      },
    });
  }

  async updateProduct(
    userId: string,
    pharmacyId: string,
    productId: string,
    dto: any,
  ) {
    const pharmacy = await this.prisma.healthPharmacy.findUnique({
      where: { id: pharmacyId },
    });
    if (!pharmacy) throw new NotFoundException();
    if (pharmacy.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.healthPharmacyProduct.update({
      where: { id: productId },
      data: dto,
    });
  }

  async deleteProduct(userId: string, pharmacyId: string, productId: string) {
    const pharmacy = await this.prisma.healthPharmacy.findUnique({
      where: { id: pharmacyId },
    });
    if (!pharmacy) throw new NotFoundException();
    if (pharmacy.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.healthPharmacyProduct.delete({
      where: { id: productId },
    });
    return { success: true };
  }

  // ── Pharmacy orders ──────────────────────────────────────────────────────
  async placeOrder(
    customerId: string,
    dto: {
      pharmacyId: string;
      items: { productId: string; quantity: number }[];
      deliveryAddress: string;
      notes?: string;
    },
  ) {
    if (!dto.items?.length) throw new BadRequestException('Cart is empty');
    if (!dto.deliveryAddress)
      throw new BadRequestException('Delivery address is required');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.healthPharmacyProduct.findMany({
      where: { id: { in: productIds } },
    });

    const subtotal = dto.items.reduce((sum, item) => {
      const p = products.find((p) => p.id === item.productId);
      if (!p)
        throw new BadRequestException(`Product ${item.productId} not found`);
      return sum + p.price * item.quantity;
    }, 0);
    const total = parseFloat(subtotal.toFixed(2));

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: customerId },
    });
    if (!wallet) throw new BadRequestException('No wallet found');
    if (wallet.balanceMasheleni < total)
      throw new BadRequestException('Insufficient MSH balance');

    const [order] = await this.prisma.$transaction([
      this.prisma.healthPharmacyOrder.create({
        data: {
          customerId,
          pharmacyId: dto.pharmacyId,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          subtotal,
          total,
          status: 'PLACED',
          items: {
            create: dto.items.map((item) => {
              const p = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: p.price,
              };
            }),
          },
        },
        include: { items: { include: { product: true } }, pharmacy: true },
      }),
      this.prisma.wallet.update({
        where: { userId: customerId },
        data: { balanceMasheleni: { decrement: total } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -total,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
    ]);
    return order;
  }

  async getMyOrders(customerId: string) {
    return this.prisma.healthPharmacyOrder.findMany({
      where: { customerId },
      include: { pharmacy: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getPharmacyOrders(userId: string) {
    const pharmacy = await this.prisma.healthPharmacy.findFirst({
      where: { ownerId: userId },
    });
    if (!pharmacy) throw new NotFoundException('No pharmacy found');
    return this.prisma.healthPharmacyOrder.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        customer: { select: { id: true, username: true, profile: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const VALID = ['PLACED', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!VALID.includes(status))
      throw new BadRequestException('Invalid status');
    const order = await this.prisma.healthPharmacyOrder.findUnique({
      where: { id: orderId },
      include: { pharmacy: true },
    });
    if (!order) throw new NotFoundException();
    if (order.pharmacy.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.healthPharmacyOrder.update({
      where: { id: orderId },
      data: { status },
    });
  }

  // ── Wellness feed ────────────────────────────────────────────────────────
  async createWellnessPost(authorId: string, dto: any) {
    if (!dto.title || !dto.description || !dto.category) {
      throw new BadRequestException(
        'Title, description and category are required',
      );
    }
    return this.prisma.healthWellnessPost.create({
      data: {
        authorId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        imageUrl: dto.imageUrl || null,
      },
    });
  }

  async listWellnessPosts(category?: string) {
    const posts = await this.prisma.healthWellnessPost.findMany({
      where: category ? { category } : {},
      include: {
        author: { select: { id: true, username: true, profile: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return posts;
  }

  async getWellnessPost(id: string, userId?: string) {
    const post = await this.prisma.healthWellnessPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, profile: true } },
        _count: { select: { likes: true } },
        likes: userId ? { where: { userId } } : false,
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return { ...post, likedByMe: userId ? post.likes.length > 0 : false };
  }

  async toggleWellnessLike(userId: string, postId: string) {
    const post = await this.prisma.healthWellnessPost.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.prisma.healthWellnessLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.healthWellnessLike.delete({
        where: { id: existing.id },
      });
      return { liked: false };
    }
    await this.prisma.healthWellnessLike.create({ data: { postId, userId } });
    return { liked: true };
  }

  async getMyWellnessPosts(authorId: string) {
    return this.prisma.healthWellnessPost.findMany({
      where: { authorId },
      include: { _count: { select: { likes: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
