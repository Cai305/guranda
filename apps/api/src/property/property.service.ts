import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';

// Guranda Property: any user can be an estate agent. Agents list homes and
// commercial spaces, assign tenants, track rent, and issue receipts and
// leases. Tenants pay rent straight from the Guranda wallet — every payment
// auto-generates a numbered receipt.

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

@Injectable()
export class PropertyService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
  ) {}

  // ── Listings ─────────────────────────────────────────────────────────

  async createProperty(agentId: string, dto: any) {
    if (dto.listingType !== 'SALE') {
      // Renting out a property means collecting ongoing rent — that's
      // creator funds, so the agent needs to be a verified account.
      await this.verificationService.assertVerified(
        agentId,
        'Listing a rental property',
      );
    }
    if (!dto.title || !dto.price || !dto.address) {
      throw new BadRequestException('Title, price and address are required');
    }
    const images: string[] = Array.isArray(dto.images)
      ? dto.images.filter(Boolean)
      : [];
    if (images.length < 5) {
      throw new BadRequestException(
        `Every listing needs at least 5 pictures — you provided ${images.length}`,
      );
    }
    return this.prisma.property.create({
      data: {
        agentId,
        title: dto.title,
        kind: dto.kind || 'APARTMENT',
        listingType: dto.listingType || 'RENT',
        price: Number(dto.price),
        address: dto.address,
        description: dto.description || null,
        images,
        bedrooms: Number(dto.bedrooms) || 0,
        bathrooms: Number(dto.bathrooms) || 0,
      },
    });
  }

  async browse(filter?: { kind?: string; listingType?: string }) {
    return this.prisma.property.findMany({
      where: {
        available: true,
        ...(filter?.kind ? { kind: filter.kind } : {}),
        ...(filter?.listingType ? { listingType: filter.listingType } : {}),
      },
      include: {
        agent: {
          select: {
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myProperties(agentId: string) {
    const props = await this.prisma.property.findMany({
      where: { agentId },
      include: {
        tenancies: {
          where: { active: true },
          include: {
            tenant: {
              select: {
                username: true,
                profile: { select: { displayName: true } },
              },
            },
            payments: { orderBy: { paidAt: 'desc' } },
            issues: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Annotate rent status for the current month
    const period = currentPeriod();
    return props.map((p) => ({
      ...p,
      tenancies: p.tenancies.map((t) => ({
        ...t,
        currentPeriod: period,
        rentPaidThisMonth: t.payments.some((pay) => pay.period === period),
        openIssues: t.issues.filter((i) => i.status !== 'RESOLVED').length,
      })),
    }));
  }

  async getProperty(id: string) {
    const p = await this.prisma.property.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  // ── Tenancies ────────────────────────────────────────────────────────

  async assignTenant(
    agentId: string,
    propertyId: string,
    dto: { tenantUsername: string; rentAmount?: number },
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.agentId !== agentId)
      throw new ForbiddenException('Only the listing agent can assign tenants');

    const tenant = await this.prisma.user.findUnique({
      where: { username: dto.tenantUsername.replace(/^@/, '') },
    });
    if (!tenant)
      throw new BadRequestException(`No Guranda user "${dto.tenantUsername}"`);
    if (tenant.id === agentId)
      throw new BadRequestException('You cannot be your own tenant');

    const tenancy = await this.prisma.tenancy.create({
      data: {
        propertyId,
        tenantId: tenant.id,
        rentAmount: Number(dto.rentAmount) || property.price,
      },
      include: { tenant: { select: { username: true } } },
    });
    await this.prisma.property.update({
      where: { id: propertyId },
      data: { available: false },
    });
    return tenancy;
  }

  async myRentals(tenantId: string) {
    const period = currentPeriod();
    const tenancies = await this.prisma.tenancy.findMany({
      where: { tenantId, active: true },
      include: {
        property: {
          include: {
            agent: {
              select: {
                username: true,
                profile: { select: { displayName: true } },
              },
            },
          },
        },
        payments: { orderBy: { paidAt: 'desc' } },
        issues: { orderBy: { createdAt: 'desc' } },
      },
    });
    return tenancies.map((t) => ({
      ...t,
      currentPeriod: period,
      rentPaidThisMonth: t.payments.some((p) => p.period === period),
    }));
  }

  // ── Rent payments (Guranda wallet) with auto-receipts ─────────────────

  async payRent(tenantId: string, tenancyId: string) {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { property: true },
    });
    if (!tenancy || !tenancy.active)
      throw new NotFoundException('Tenancy not found');
    if (tenancy.tenantId !== tenantId)
      throw new ForbiddenException('Not your tenancy');

    const period = currentPeriod();
    const already = await this.prisma.rentPayment.findFirst({
      where: { tenancyId, period },
    });
    if (already) {
      throw new BadRequestException(
        `Rent for ${period} is already paid (receipt ${already.receiptNo})`,
      );
    }

    const amount = Number(tenancy.rentAmount);
    const tenantWallet = await this.prisma.wallet.findUnique({
      where: { userId: tenantId },
    });
    const agentWallet = await this.prisma.wallet.findUnique({
      where: { userId: tenancy.property.agentId },
    });
    if (!tenantWallet || !agentWallet)
      throw new BadRequestException('Wallet not found');
    if (Number(tenantWallet.balanceMasheleni) < amount) {
      throw new BadRequestException(
        `Not enough MSH — rent is ${amount}, balance is ${tenantWallet.balanceMasheleni}`,
      );
    }

    // Auto-generate the receipt number: LOS-YYYYMM-XXXX
    const count = await this.prisma.rentPayment.count();
    const receiptNo = `LOS-${period.replace('-', '')}-${String(count + 1).padStart(4, '0')}`;

    const [, , , , payment] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: tenantWallet.id },
        data: { balanceMasheleni: { decrement: amount } },
      }),
      this.prisma.wallet.update({
        where: { id: agentWallet.id },
        data: { balanceMasheleni: { increment: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: tenantWallet.id,
          amount: -amount,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: agentWallet.id,
          amount,
          type: 'RECEIVE',
          status: 'SUCCESS',
        },
      }),
      this.prisma.rentPayment.create({
        data: { tenancyId, amount, period, receiptNo },
      }),
    ]);

    return { success: true, payment, receiptNo };
  }

  // ── Lease generation ─────────────────────────────────────────────────

  async getLease(userId: string, tenancyId: string) {
    const t = await this.prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: {
        property: {
          include: {
            agent: {
              select: {
                id: true,
                username: true,
                profile: { select: { displayName: true } },
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Tenancy not found');
    if (t.tenantId !== userId && t.property.agentId !== userId) {
      throw new ForbiddenException(
        'Only the agent or tenant can view this lease',
      );
    }
    return {
      leaseNo: `LEASE-${t.id.slice(0, 8).toUpperCase()}`,
      property: {
        title: t.property.title,
        address: t.property.address,
        kind: t.property.kind,
      },
      landlord:
        t.property.agent.profile?.displayName || t.property.agent.username,
      landlordUsername: t.property.agent.username,
      tenant: t.tenant.profile?.displayName || t.tenant.username,
      tenantUsername: t.tenant.username,
      rentAmount: t.rentAmount,
      startDate: t.startDate,
      generatedAt: new Date(),
    };
  }

  // ── Issues ───────────────────────────────────────────────────────────

  async reportIssue(
    tenantId: string,
    tenancyId: string,
    dto: { title: string; description?: string },
  ) {
    const t = await this.prisma.tenancy.findUnique({
      where: { id: tenancyId },
    });
    if (!t || t.tenantId !== tenantId)
      throw new ForbiddenException('Not your tenancy');
    if (!dto.title) throw new BadRequestException('Title is required');
    return this.prisma.propertyIssue.create({
      data: {
        tenancyId,
        title: dto.title,
        description: dto.description || null,
      },
    });
  }

  async updateIssue(agentId: string, issueId: string, status: string) {
    const issue = await this.prisma.propertyIssue.findUnique({
      where: { id: issueId },
      include: { tenancy: { include: { property: true } } },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    if (issue.tenancy.property.agentId !== agentId) {
      throw new ForbiddenException('Only the agent can update issues');
    }
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.prisma.propertyIssue.update({
      where: { id: issueId },
      data: { status },
    });
  }
}
