import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// "Brand stores" general retail — one store per user, same shape as Eat,
// minus delivery logistics. The differentiator: every paid order credits
// REWARD_RATE of the subtotal straight back to the buyer's wallet as a
// 'REWARD' transaction — cashback, funded by the platform, not the seller.
const REWARD_RATE = 0.03;

@Injectable()
export class ShoppingService {
  constructor(private prisma: PrismaService) {}

  // ── Stores ──────────────────────────────────────────────────────────────
  async listStores(category?: string) {
    return this.prisma.shoppingStore.findMany({
      where: { isOpen: true, ...(category ? { category } : {}) },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
        _count: { select: { products: true } },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async getStore(id: string) {
    const store = await this.prisma.shoppingStore.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
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
    return this.prisma.shoppingStore.findFirst({
      where: { ownerId: userId },
      include: { products: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async createStore(userId: string, dto: any) {
    const existing = await this.prisma.shoppingStore.findFirst({
      where: { ownerId: userId },
    });
    if (existing) throw new BadRequestException('You already have a store');
    if (!dto.name || !dto.category)
      throw new BadRequestException('Name and category are required');
    return this.prisma.shoppingStore.create({
      data: { ownerId: userId, ...dto },
    });
  }

  async updateStore(userId: string, id: string, dto: any) {
    const store = await this.prisma.shoppingStore.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.shoppingStore.update({ where: { id }, data: dto });
  }

  async deleteStore(userId: string, id: string) {
    const store = await this.prisma.shoppingStore.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.shoppingStore.delete({ where: { id } });
    return { success: true };
  }

  // ── Products (Takealot-style product-first browse) ─────────────────────
  async listProducts(filters: { category?: string; search?: string }) {
    return this.prisma.shoppingProduct.findMany({
      where: {
        isAvailable: true,
        store: { isOpen: true },
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        store: {
          select: { id: true, name: true, category: true, rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.shoppingProduct.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            category: true,
            rating: true,
            isOpen: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async addProduct(userId: string, storeId: string, dto: any) {
    const store = await this.prisma.shoppingStore.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== userId) throw new ForbiddenException();
    if (!dto.name || !(Number(dto.price) > 0))
      throw new BadRequestException('Name and a positive price are required');
    return this.prisma.shoppingProduct.create({
      data: { storeId, ...dto, price: Number(dto.price) },
    });
  }

  async updateProduct(
    userId: string,
    storeId: string,
    productId: string,
    dto: any,
  ) {
    const store = await this.prisma.shoppingStore.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException();
    if (store.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.shoppingProduct.update({
      where: { id: productId },
      data: dto,
    });
  }

  async deleteProduct(userId: string, storeId: string, productId: string) {
    const store = await this.prisma.shoppingStore.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException();
    if (store.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.shoppingProduct.delete({ where: { id: productId } });
    return { success: true };
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async placeOrder(
    customerId: string,
    dto: {
      storeId: string;
      items: { productId: string; quantity: number }[];
      shippingAddress: string;
      notes?: string;
    },
  ) {
    if (!dto.items?.length) throw new BadRequestException('Cart is empty');
    if (!dto.shippingAddress)
      throw new BadRequestException('Shipping address is required');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.shoppingProduct.findMany({
      where: { id: { in: productIds } },
    });

    const subtotal = dto.items.reduce((sum, item) => {
      const p = products.find((p) => p.id === item.productId);
      if (!p)
        throw new BadRequestException(`Product ${item.productId} not found`);
      return sum + p.price * item.quantity;
    }, 0);

    const total = parseFloat(subtotal.toFixed(2));
    const rewardEarned = parseFloat((subtotal * REWARD_RATE).toFixed(2));

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: customerId },
    });
    if (!wallet) throw new BadRequestException('No wallet found');
    if (wallet.balanceMasheleni < total)
      throw new BadRequestException('Insufficient MSH balance');

    const [order] = await this.prisma.$transaction([
      this.prisma.shoppingOrder.create({
        data: {
          customerId,
          storeId: dto.storeId,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes,
          subtotal,
          total,
          rewardEarned,
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
        include: { items: { include: { product: true } }, store: true },
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
      this.prisma.wallet.update({
        where: { userId: customerId },
        data: { balanceMasheleni: { increment: rewardEarned } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: rewardEarned,
          type: 'REWARD',
          status: 'SUCCESS',
        },
      }),
    ]);

    return order;
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.shoppingOrder.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        items: { include: { product: true } },
        customer: { select: { id: true, username: true, profile: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getMyOrders(customerId: string) {
    return this.prisma.shoppingOrder.findMany({
      where: { customerId },
      include: { store: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getStoreOrders(userId: string) {
    const store = await this.prisma.shoppingStore.findFirst({
      where: { ownerId: userId },
    });
    if (!store) throw new NotFoundException('No store found');
    return this.prisma.shoppingOrder.findMany({
      where: { storeId: store.id },
      include: {
        customer: { select: { id: true, username: true, profile: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const VALID = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!VALID.includes(status))
      throw new BadRequestException('Invalid status');
    const order = await this.prisma.shoppingOrder.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order) throw new NotFoundException();
    if (order.store.ownerId !== userId) throw new ForbiddenException();

    // Store owner is paid once the order is actually delivered. Guarded on
    // the current status so re-marking an already-delivered order DELIVERED
    // can't double-pay the owner. The buyer's cashback (rewardEarned) is
    // platform-funded, not deducted from this — see REWARD_RATE above.
    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      const ownerWallet = await this.prisma.wallet.findUnique({
        where: { userId: order.store.ownerId },
      });
      if (!ownerWallet)
        throw new BadRequestException("Store owner's wallet not found");
      const [, updated] = await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: ownerWallet.id },
          data: { balanceMasheleni: { increment: order.subtotal } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: ownerWallet.id,
            amount: order.subtotal,
            type: 'SHOPPING_ORDER_PAYOUT',
            status: 'SUCCESS',
          },
        }),
        this.prisma.shoppingOrder.update({
          where: { id: orderId },
          data: { status },
        }),
      ]);
      return updated;
    }

    return this.prisma.shoppingOrder.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
