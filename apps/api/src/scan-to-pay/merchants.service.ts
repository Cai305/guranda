import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterMerchantDto } from './dto/register-merchant.dto';

const STAFF_ROLES = ['OWNER', 'MANAGER', 'CASHIER', 'SECURITY'];

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  // Registering a merchant creates it PENDING (brief §1: vetted/approved
  // before it can accept Scan to Pay) plus its first store, and makes the
  // registering user its OWNER staff member so they can manage it the
  // moment it's approved without a separate "add myself as staff" step.
  async register(userId: string, dto: RegisterMerchantDto) {
    const merchant = await this.prisma.merchant.create({
      data: {
        ownerId: userId,
        name: dto.name,
        category: dto.category,
        description: dto.description,
        address: dto.address,
        status: 'PENDING',
        stores: {
          create: { name: dto.storeName, address: dto.storeAddress },
        },
      },
      include: { stores: true },
    });

    await this.prisma.merchantStaff.create({
      data: {
        merchantId: merchant.id,
        storeId: merchant.stores[0].id,
        userId,
        role: 'OWNER',
      },
    });

    return merchant;
  }

  // Store discovery (brief §2) — only APPROVED merchants are selectable,
  // matching "the customer should only be able to select approved Guranda
  // merchants."
  async listApproved(q?: string) {
    return this.prisma.merchant.findMany({
      where: {
        status: 'APPROVED',
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: { stores: true },
      orderBy: { name: 'asc' },
    });
  }

  async getApproved(merchantId: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: merchantId, status: 'APPROVED' },
      include: { stores: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  // Merchants/stores where the caller has a staff role — gates the
  // merchant-side checkout QR and security screens in the mobile app.
  async myStaffRoles(userId: string) {
    return this.prisma.merchantStaff.findMany({
      where: { userId },
      include: { merchant: true, store: true },
    });
  }

  async assertStaff(userId: string, merchantId: string, roles: string[] = STAFF_ROLES) {
    const staff = await this.prisma.merchantStaff.findFirst({
      where: { userId, merchantId, role: { in: roles } },
    });
    if (!staff) {
      throw new ForbiddenException('Not authorized for this merchant');
    }
    return staff;
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  async listPending() {
    return this.prisma.merchant.findMany({
      where: { status: 'PENDING' },
      include: { stores: true, owner: { select: { username: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(merchantId: string) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async reject(merchantId: string) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: 'REJECTED' },
    });
  }
}
