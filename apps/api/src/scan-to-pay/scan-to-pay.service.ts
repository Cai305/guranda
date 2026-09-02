import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { MerchantsService } from './merchants.service';
import { StartSessionDto } from './dto/start-session.dto';
import { ScanItemDto, UpdateItemDto } from './dto/scan-item.dto';

const SESSION_INCLUDE = { merchant: true, store: true, items: true } as const;
const CHECKOUT_QR_TTL_MS = 60_000;

@Injectable()
export class ScanToPayService {
  constructor(
    private prisma: PrismaService,
    private merchants: MerchantsService,
  ) {}

  // ── Sessions ───────────────────────────────────────────────────────────

  async startSession(customerId: string, dto: StartSessionDto) {
    const store = await this.prisma.merchantStore.findFirst({
      where: { id: dto.storeId, merchantId: dto.merchantId },
    });
    if (!store) throw new NotFoundException('Store not found');
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: dto.merchantId, status: 'APPROVED' },
    });
    if (!merchant) throw new NotFoundException('Merchant not found or not approved');

    const existing = await this.prisma.shoppingSession.findFirst({
      where: { customerId, merchantId: dto.merchantId, storeId: dto.storeId, status: 'ACTIVE' },
    });
    if (existing) return this.getSession(customerId, existing.id);

    // Only one active shop at a time — starting a new one elsewhere quietly
    // retires any other in-progress session rather than leaving it stranded.
    await this.prisma.shoppingSession.updateMany({
      where: { customerId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const session = await this.prisma.shoppingSession.create({
      data: {
        customerId,
        merchantId: dto.merchantId,
        storeId: dto.storeId,
        budget: dto.budget,
        groceryList: dto.groceryList ?? [],
      },
    });
    return this.getSession(customerId, session.id);
  }

  async getActiveSession(customerId: string) {
    const session = await this.prisma.shoppingSession.findFirst({
      where: { customerId, status: 'ACTIVE' },
      include: SESSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return session ? this.serialize(session) : null;
  }

  async getSession(customerId: string, sessionId: string) {
    const session = await this.prisma.shoppingSession.findFirst({
      where: { id: sessionId, customerId },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException('Shopping session not found');
    return this.serialize(session);
  }

  async cancelSession(customerId: string, sessionId: string) {
    const session = await this.findOwnedActiveSession(customerId, sessionId);
    await this.prisma.shoppingSession.update({
      where: { id: session.id },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: true };
  }

  // ── Cart ───────────────────────────────────────────────────────────────

  // The scan IS the item — same barcode scanned again just bumps qty
  // instead of creating a duplicate row (brief §3: "the customer's scan is
  // what creates the shopping item").
  async addItem(customerId: string, sessionId: string, dto: ScanItemDto) {
    const session = await this.findOwnedActiveSession(customerId, sessionId);
    const existing = session.items.find((i) => i.barcode === dto.barcode);
    if (existing) {
      await this.prisma.shoppingSessionItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + (dto.qty ?? 1) },
      });
    } else {
      await this.prisma.shoppingSessionItem.create({
        data: {
          sessionId,
          barcode: dto.barcode,
          name: dto.name,
          price: dto.price,
          qty: dto.qty ?? 1,
        },
      });
    }
    return this.getSession(customerId, sessionId);
  }

  async updateItem(customerId: string, sessionId: string, itemId: string, dto: UpdateItemDto) {
    const session = await this.findOwnedActiveSession(customerId, sessionId);
    const item = session.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item not found in this session');

    if (dto.qty === 0) {
      await this.prisma.shoppingSessionItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.shoppingSessionItem.update({
        where: { id: itemId },
        data: {
          ...(dto.qty != null ? { qty: dto.qty } : {}),
          ...(dto.price != null ? { price: dto.price } : {}),
        },
      });
    }
    return this.getSession(customerId, sessionId);
  }

  async removeItem(customerId: string, sessionId: string, itemId: string) {
    const session = await this.findOwnedActiveSession(customerId, sessionId);
    const item = session.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item not found in this session');
    await this.prisma.shoppingSessionItem.delete({ where: { id: itemId } });
    return this.getSession(customerId, sessionId);
  }

  // Every shopper's scan already writes {barcode, name, price} into
  // ShoppingSessionItem — reusing the most recent one for a barcode gives a
  // real, honest "have I seen this before" prefill with no merchant
  // inventory integration and no external product API (brief §3-4: the
  // scan itself creates the item; an external image/lookup service is
  // explicitly optional). The customer can always edit before confirming.
  async lookupBarcode(barcode: string) {
    const recent = await this.prisma.shoppingSessionItem.findFirst({
      where: { barcode },
      orderBy: { createdAt: 'desc' },
    });
    return recent ? { name: recent.name, price: Number(recent.price) } : null;
  }

  // ── Merchant checkout QR (staff side) ─────────────────────────────────

  async generateCheckoutQr(userId: string, storeId: string) {
    const store = await this.prisma.merchantStore.findUnique({
      where: { id: storeId },
      include: { merchant: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    await this.merchants.assertStaff(userId, store.merchantId);

    const token = randomBytes(9).toString('base64url');
    const expiresAt = new Date(Date.now() + CHECKOUT_QR_TTL_MS);
    await this.prisma.merchantStore.update({
      where: { id: storeId },
      data: { checkoutToken: token, checkoutTokenExpiresAt: expiresAt },
    });

    return {
      token,
      expiresAt,
      merchantId: store.merchantId,
      merchantName: store.merchant.name,
      storeId: store.id,
      storeName: store.name,
      qrValue: `guranda://scan-to-pay/checkout?storeId=${store.id}&token=${token}`,
    };
  }

  // Lets the staff checkout screen learn a payment landed, without websockets
  // — polled every couple of seconds while a QR is on screen.
  async latestPaidTransaction(userId: string, storeId: string, sinceIso?: string) {
    const store = await this.prisma.merchantStore.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    await this.merchants.assertStaff(userId, store.merchantId);

    const since = sinceIso ? new Date(sinceIso) : new Date(Date.now() - 5 * 60_000);
    const txn = await this.prisma.scanToPayTransaction.findFirst({
      where: { storeId, status: 'PAID', paidAt: { gte: since } },
      orderBy: { paidAt: 'desc' },
      include: {
        customer: { select: { username: true, profile: { select: { displayName: true } } } },
      },
    });
    return txn ? this.serializeTransaction(txn) : null;
  }

  // ── Payment ────────────────────────────────────────────────────────────

  // Synchronous, internal-ledger-only settlement — there's no external
  // payment gateway in this MVP, so PROCESSING is a UI-only in-flight state
  // for the duration of this call, never a persisted one; PENDING briefly
  // exists between the row being created and the transfer resolving so a
  // crash mid-transfer still leaves an auditable, non-PAID record rather
  // than silently vanishing.
  async pay(customerId: string, sessionId: string, checkoutToken: string) {
    const session = await this.findOwnedActiveSession(customerId, sessionId);
    if (session.items.length === 0) {
      throw new BadRequestException('Scan at least one item before paying');
    }

    const store = await this.prisma.merchantStore.findUnique({ where: { id: session.storeId } });
    if (
      !store?.checkoutToken ||
      store.checkoutToken !== checkoutToken ||
      !store.checkoutTokenExpiresAt ||
      store.checkoutTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException("This checkout code has expired — ask the till to refresh it");
    }

    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: session.merchantId } });

    const subtotal = session.items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
    const total = subtotal;
    const itemsSnapshot = session.items.map((i) => ({
      barcode: i.barcode,
      name: i.name,
      price: Number(i.price),
      qty: i.qty,
    }));

    const transaction = await this.prisma.scanToPayTransaction.create({
      data: {
        sessionId: session.id,
        customerId,
        merchantId: session.merchantId,
        storeId: session.storeId,
        subtotal,
        discount: 0,
        fees: 0,
        total,
        status: 'PENDING',
        itemsSnapshot,
      },
    });

    const fail = async (message: string) => {
      await this.prisma.scanToPayTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(message);
    };

    const customerWallet = await this.prisma.wallet.findUnique({ where: { userId: customerId } });
    const merchantWallet = await this.prisma.wallet.findUnique({ where: { userId: merchant.ownerId } });
    if (!customerWallet || !merchantWallet) {
      return fail('Wallet not found');
    }
    if (Number(customerWallet.balanceMasheleni) < total) {
      return fail(`Not enough MSH — balance is ${customerWallet.balanceMasheleni}`);
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: customerWallet.id },
        data: { balanceMasheleni: { decrement: total } },
      }),
      this.prisma.wallet.update({
        where: { id: merchantWallet.id },
        data: { balanceMasheleni: { increment: total } },
      }),
      this.prisma.transaction.create({
        data: { walletId: customerWallet.id, amount: -total, type: 'PAYMENT', status: 'SUCCESS' },
      }),
      this.prisma.transaction.create({
        data: { walletId: merchantWallet.id, amount: total, type: 'SCAN_TO_PAY_PAYOUT', status: 'SUCCESS' },
      }),
      this.prisma.scanToPayTransaction.update({
        where: { id: transaction.id },
        data: { status: 'PAID', paidAt: new Date() },
      }),
      this.prisma.shoppingSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' },
      }),
      // Single-use — the same QR frame can't pay a second session.
      this.prisma.merchantStore.update({
        where: { id: session.storeId },
        data: { checkoutToken: null, checkoutTokenExpiresAt: null },
      }),
    ]);

    return this.getReceipt(customerId, transaction.id);
  }

  // ── Receipts ───────────────────────────────────────────────────────────

  async getReceipt(customerId: string, transactionId: string) {
    const txn = await this.prisma.scanToPayTransaction.findFirst({
      where: { id: transactionId, customerId },
      include: { merchant: true, store: true },
    });
    if (!txn) throw new NotFoundException('Receipt not found');
    return this.serializeTransaction(txn);
  }

  async myReceipts(customerId: string) {
    const txns = await this.prisma.scanToPayTransaction.findMany({
      where: { customerId, status: 'PAID' },
      include: { merchant: true, store: true },
      orderBy: { paidAt: 'desc' },
    });
    return txns.map((t) => this.serializeTransaction(t));
  }

  // ── Security verification (staff side) ────────────────────────────────

  async verifyReceipt(userId: string, transactionId: string) {
    const txn = await this.prisma.scanToPayTransaction.findUnique({
      where: { id: transactionId },
      include: { merchant: true, store: true },
    });
    if (!txn) throw new NotFoundException('Receipt not found');
    await this.merchants.assertStaff(userId, txn.merchantId);
    if (txn.status !== 'PAID') {
      throw new BadRequestException('This transaction was not paid');
    }
    if (!txn.verifiedAt) {
      await this.prisma.scanToPayTransaction.update({
        where: { id: txn.id },
        data: { verifiedAt: new Date() },
      });
    }
    return this.serializeTransaction(txn);
  }

  async verifyItem(userId: string, transactionId: string, barcode: string) {
    const txn = await this.prisma.scanToPayTransaction.findUnique({ where: { id: transactionId } });
    if (!txn) throw new NotFoundException('Receipt not found');
    await this.merchants.assertStaff(userId, txn.merchantId);

    const items = txn.itemsSnapshot as { barcode: string; name: string; price: number; qty: number }[];
    const match = items.find((i) => i.barcode === barcode);

    if (!match) {
      await this.prisma.scanToPayTransaction.update({
        where: { id: txn.id },
        data: { flagged: true },
      });
    }

    return { verified: !!match, item: match ?? null };
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  private async findOwnedActiveSession(customerId: string, sessionId: string) {
    const session = await this.prisma.shoppingSession.findFirst({
      where: { id: sessionId, customerId },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException('Shopping session not found');
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('This shopping session is no longer active');
    }
    return session;
  }

  private matchGrocery(itemName: string, groceryList: string[]): string | null {
    const lower = itemName.toLowerCase();
    return groceryList.find((g) => lower.includes(g.toLowerCase())) ?? null;
  }

  private serialize(session: any) {
    const items = session.items.map((i: any) => ({
      id: i.id,
      barcode: i.barcode,
      name: i.name,
      price: Number(i.price),
      qty: i.qty,
      lineTotal: Number(i.price) * i.qty,
      matchedGroceryItem: this.matchGrocery(i.name, session.groceryList),
    }));
    const subtotal = items.reduce((s: number, i: any) => s + i.lineTotal, 0);
    const itemCount = items.reduce((s: number, i: any) => s + i.qty, 0);
    const matchedNames = new Set(items.map((i: any) => i.matchedGroceryItem).filter(Boolean));

    return {
      id: session.id,
      status: session.status,
      budget: session.budget != null ? Number(session.budget) : null,
      groceryList: session.groceryList.map((name: string) => ({
        name,
        matched: matchedNames.has(name),
      })),
      merchant: { id: session.merchant.id, name: session.merchant.name, category: session.merchant.category },
      store: { id: session.store.id, name: session.store.name, address: session.store.address },
      items,
      subtotal,
      itemCount,
      remaining: session.budget != null ? Number(session.budget) - subtotal : null,
      createdAt: session.createdAt,
    };
  }

  private serializeTransaction(txn: any) {
    return {
      id: txn.id,
      status: txn.status,
      merchant: { id: txn.merchant.id, name: txn.merchant.name },
      store: { id: txn.store.id, name: txn.store.name, address: txn.store.address },
      subtotal: Number(txn.subtotal),
      discount: Number(txn.discount),
      fees: Number(txn.fees),
      total: Number(txn.total),
      items: txn.itemsSnapshot,
      paidAt: txn.paidAt,
      createdAt: txn.createdAt,
      verifiedAt: txn.verifiedAt,
      flagged: txn.flagged,
      customer: txn.customer
        ? { username: txn.customer.username, displayName: txn.customer.profile?.displayName }
        : undefined,
    };
  }
}
