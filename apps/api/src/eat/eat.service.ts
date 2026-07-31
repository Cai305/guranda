import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const DELIVERY_FEE = 20;
const SERVICE_FEE_RATE = 0.015;

@Injectable()
export class EatService {
  constructor(private prisma: PrismaService) {}

  // ── Stores ──────────────────────────────────────────────────────────────
  async listStores(category?: string) {
    return this.prisma.eatStore.findMany({
      where: { isOpen: true, ...(category ? { category } : {}) },
      include: {
        owner: { include: { profile: true } },
        _count: { select: { products: true } },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async getStore(id: string) {
    const store = await this.prisma.eatStore.findUnique({
      where: { id },
      include: {
        owner: { include: { profile: true } },
        products: {
          where: { isAvailable: true },
          orderBy: { category: 'asc' },
        },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async getMyStore(userId: string) {
    return this.prisma.eatStore.findFirst({
      where: { ownerId: userId },
      include: { products: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async createStore(userId: string, dto: any) {
    const existing = await this.prisma.eatStore.findFirst({
      where: { ownerId: userId },
    });
    if (existing) throw new BadRequestException('You already have a store');
    return this.prisma.eatStore.create({
      data: { ownerId: userId, ...dto },
    });
  }

  async updateStore(userId: string, id: string, dto: any) {
    const store = await this.prisma.eatStore.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.eatStore.update({ where: { id }, data: dto });
  }

  async deleteStore(userId: string, id: string) {
    const store = await this.prisma.eatStore.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.eatStore.delete({ where: { id } });
    return { success: true };
  }

  // ── Products ─────────────────────────────────────────────────────────────
  async addProduct(userId: string, storeId: string, dto: any) {
    const store = await this.prisma.eatStore.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.eatProduct.create({ data: { storeId, ...dto } });
  }

  async updateProduct(
    userId: string,
    storeId: string,
    productId: string,
    dto: any,
  ) {
    const store = await this.prisma.eatStore.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException();
    if (store.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.eatProduct.update({
      where: { id: productId },
      data: dto,
    });
  }

  async deleteProduct(userId: string, storeId: string, productId: string) {
    const store = await this.prisma.eatStore.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException();
    if (store.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.eatProduct.delete({ where: { id: productId } });
    return { success: true };
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async placeOrder(
    customerId: string,
    dto: {
      storeId: string;
      items: { productId: string; quantity: number }[];
      deliveryAddress: string;
      notes?: string;
    },
  ) {
    // Fetch products to get current prices
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.eatProduct.findMany({
      where: { id: { in: productIds } },
    });

    const subtotal = dto.items.reduce((sum, item) => {
      const p = products.find((p) => p.id === item.productId);
      if (!p)
        throw new BadRequestException(`Product ${item.productId} not found`);
      return sum + p.price * item.quantity;
    }, 0);

    const serviceFee = parseFloat((subtotal * SERVICE_FEE_RATE).toFixed(2));
    const deliveryFee = DELIVERY_FEE;
    const total = parseFloat((subtotal + serviceFee + deliveryFee).toFixed(2));

    // Check wallet balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: customerId },
    });
    if (!wallet) throw new BadRequestException('No wallet found');
    if (wallet.balanceMasheleni < total)
      throw new BadRequestException('Insufficient MSH balance');

    // Deduct from wallet and create order atomically
    const [order] = await this.prisma.$transaction([
      this.prisma.eatOrder.create({
        data: {
          customerId,
          storeId: dto.storeId,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          subtotal,
          serviceFee,
          deliveryFee,
          total,
          status: 'PENDING',
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
        include: { items: { include: { product: true } }, store: true },
      }),
      this.prisma.wallet.update({
        where: { userId: customerId },
        data: { balanceMasheleni: { decrement: total } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: total,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
    ]);

    return order;
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.eatOrder.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        items: { include: { product: true } },
        customer: { include: { profile: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getMyOrders(customerId: string) {
    return this.prisma.eatOrder.findMany({
      where: { customerId },
      include: {
        store: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getStoreOrders(userId: string) {
    const store = await this.prisma.eatStore.findFirst({
      where: { ownerId: userId },
    });
    if (!store) throw new NotFoundException('No store found');
    return this.prisma.eatOrder.findMany({
      where: { storeId: store.id },
      include: {
        customer: { include: { profile: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const order = await this.prisma.eatOrder.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order) throw new NotFoundException();
    if (order.store.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.eatOrder.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
