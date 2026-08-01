import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// No wallet-reserve/escrow mechanism exists anywhere in this codebase — every
// money flow here is "check balance now, debit atomically now" (see
// story.service.ts chargeInteraction, username bidding). Sponsorship payment
// follows that same pattern: nothing is charged when a business proposes a
// sponsorship, the full budget is debited in one atomic transaction only
// when an admin approves it.
@Injectable()
export class ChallengeSponsorshipService {
  constructor(private prisma: PrismaService) {}

  private async findEligibleBusiness(userId: string) {
    const verification = await this.prisma.verification.findUnique({
      where: { userId },
      include: { businesses: true },
    });
    if (!verification || !verification.hasBusiness || verification.status !== 'VERIFIED' || verification.businesses.length === 0) {
      return null;
    }
    return verification.businesses[0];
  }

  async checkEligibility(userId: string) {
    const business = await this.findEligibleBusiness(userId);
    return { eligible: !!business, businessName: business?.name ?? null };
  }

  async proposeSponsorship(userId: string, data: {
    title: string; description: string; promptText?: string;
    category: string; type: string; startAt: string; endAt: string; budget: number;
  }) {
    const business = await this.findEligibleBusiness(userId);
    if (!business) {
      throw new ForbiddenException('Only verified business accounts can sponsor a challenge');
    }
    if (!(data.budget > 0)) {
      throw new BadRequestException('budget must be a positive amount');
    }

    const challenge = await this.prisma.challenge.create({
      data: {
        title: data.title,
        description: data.description,
        promptText: data.promptText,
        category: data.category as any,
        type: data.type as any,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        createdByAdminId: null,
      },
    });
    const sponsorship = await this.prisma.challengeSponsorship.create({
      data: {
        challengeId: challenge.id,
        businessId: business.id,
        sponsorName: business.name,
        budget: data.budget,
        status: 'PENDING',
      },
    });
    return { challenge, sponsorship };
  }

  async adminList() {
    return this.prisma.challengeSponsorship.findMany({
      orderBy: { createdAt: 'desc' },
      include: { challenge: true, business: true },
    });
  }

  async approve(sponsorshipId: string) {
    const sponsorship = await this.prisma.challengeSponsorship.findUnique({
      where: { id: sponsorshipId },
      include: { business: { include: { verification: true } } },
    });
    if (!sponsorship) throw new NotFoundException('Sponsorship not found');
    if (sponsorship.status !== 'PENDING') {
      throw new BadRequestException('Only a pending sponsorship can be approved');
    }

    const ownerUserId = sponsorship.business.verification.userId;
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: ownerUserId } });
    if (!wallet) throw new NotFoundException('Sponsor wallet not found');
    if (Number(wallet.balanceMasheleni) < sponsorship.budget) {
      throw new BadRequestException(`Sponsor has insufficient balance — balance is ${wallet.balanceMasheleni}, budget is ${sponsorship.budget}`);
    }

    const [, , , , updatedSponsorship] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { decrement: sponsorship.budget } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: sponsorship.budget,
          type: 'CHALLENGE_SPONSORSHIP',
          status: 'SUCCESS',
        },
      }),
      this.prisma.challenge.update({
        where: { id: sponsorship.challengeId },
        data: { status: 'ACTIVE', sponsorLabel: sponsorship.sponsorName },
      }),
      this.prisma.challengeSponsorship.update({
        where: { id: sponsorshipId },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.challengeSponsorship.findUnique({ where: { id: sponsorshipId } }),
    ]);
    return updatedSponsorship;
  }

  async reject(sponsorshipId: string) {
    const sponsorship = await this.prisma.challengeSponsorship.findUnique({ where: { id: sponsorshipId } });
    if (!sponsorship) throw new NotFoundException('Sponsorship not found');
    if (sponsorship.status !== 'PENDING') {
      throw new BadRequestException('Only a pending sponsorship can be rejected');
    }
    return this.prisma.challengeSponsorship.update({ where: { id: sponsorshipId }, data: { status: 'REJECTED' } });
  }
}
