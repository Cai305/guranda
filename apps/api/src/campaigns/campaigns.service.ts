import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

// Money-on-approval, no escrow — identical pattern to
// ChallengeSponsorshipService: nothing is charged when a campaign is
// created, the full budget is debited in one atomic transaction only when
// an admin approves it.
function pctDelta(curr: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

const BUDGETED_TYPES = ['BUSINESS', 'MINI_APP_LAUNCH'];

@Injectable()
export class CampaignsService {
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

  async create(userId: string, dto: CreateCampaignDto) {
    if (dto.type === 'PLATFORM_UPDATE') {
      throw new BadRequestException('Platform updates are created by admins, not this endpoint');
    }

    let businessId: string | null = null;
    if (BUDGETED_TYPES.includes(dto.type)) {
      const business = await this.findEligibleBusiness(userId);
      if (!business) {
        throw new ForbiddenException('Only verified business accounts can create this campaign type');
      }
      if (!(dto.budget && dto.budget > 0)) {
        throw new BadRequestException('budget must be a positive amount for this campaign type');
      }
      businessId = business.id;
    }

    return this.prisma.campaign.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        goal: dto.goal,
        rewardLabel: dto.rewardLabel,
        estimatedMinutes: dto.estimatedMinutes,
        actionLabel: dto.actionLabel,
        actionRoute: dto.actionRoute as any,
        coverImageUrl: dto.coverImageUrl,
        budget: businessId ? dto.budget : 0,
        targetMinReputationLevel: dto.targetMinReputationLevel,
        targetCategories: dto.targetCategories ?? [],
        createdByUserId: userId,
        createdByBusinessId: businessId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: 'PENDING',
      },
    });
  }

  async getById(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { createdByBusiness: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  listMine(userId: string) {
    return this.prisma.campaign.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  adminList() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdByUser: { select: { id: true, username: true } }, createdByBusiness: true },
    });
  }

  // Admin-authored, no approval loop — goes live immediately, same as an
  // admin-published Challenge.
  async adminCreatePlatformUpdate(adminId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        type: 'PLATFORM_UPDATE',
        status: 'ACTIVE',
        title: dto.title,
        description: dto.description,
        goal: dto.goal,
        rewardLabel: dto.rewardLabel,
        estimatedMinutes: dto.estimatedMinutes,
        actionLabel: dto.actionLabel,
        actionRoute: dto.actionRoute as any,
        coverImageUrl: dto.coverImageUrl,
        budget: 0,
        targetMinReputationLevel: dto.targetMinReputationLevel,
        targetCategories: dto.targetCategories ?? [],
        // PLATFORM_UPDATE has no real user creator — the caller is an admin
        // acting outside the user table, so this points at nothing
        // meaningful. adminCreatePlatformUpdate() is the only writer, and
        // listMine()/analytics ownership checks never see PLATFORM_UPDATE
        // rows since the admin-only creation path is the sole entry point.
        createdByUserId: adminId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
    });
  }

  async approve(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { createdByBusiness: { include: { verification: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING') {
      throw new BadRequestException('Only a pending campaign can be approved');
    }

    if (campaign.budget > 0 && campaign.createdByBusiness) {
      const ownerUserId = campaign.createdByBusiness.verification.userId;
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: ownerUserId } });
      if (!wallet) throw new NotFoundException('Sponsor wallet not found');
      if (Number(wallet.balanceMasheleni) < campaign.budget) {
        throw new BadRequestException(`Sponsor has insufficient balance — balance is ${wallet.balanceMasheleni}, budget is ${campaign.budget}`);
      }
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balanceMasheleni: { decrement: campaign.budget } },
        }),
        this.prisma.transaction.create({
          data: { walletId: wallet.id, amount: campaign.budget, type: 'CAMPAIGN_SPONSORSHIP', status: 'SUCCESS' },
        }),
        this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'ACTIVE' } }),
      ]);
    } else {
      await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'ACTIVE' } });
    }

    return this.prisma.campaign.findUnique({ where: { id: campaignId } });
  }

  async reject(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING') {
      throw new BadRequestException('Only a pending campaign can be rejected');
    }
    return this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'REJECTED' } });
  }

  trackClick(campaignId: string) {
    return this.prisma.campaign.update({ where: { id: campaignId }, data: { clicks: { increment: 1 } } });
  }

  trackCompletion(campaignId: string) {
    return this.prisma.campaign.update({ where: { id: campaignId }, data: { completions: { increment: 1 } } });
  }

  async getAnalytics(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.createdByUserId !== userId) {
      throw new ForbiddenException('You can only view analytics for your own campaigns');
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snapshot = await this.prisma.campaignMetricsSnapshot.findFirst({
      where: { campaignId, capturedAt: { lte: weekAgo } },
      orderBy: { capturedAt: 'desc' },
    });

    return {
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      completions: campaign.completions,
      spent: campaign.budget,
      deltaImpressionsPct: snapshot ? pctDelta(campaign.impressions, snapshot.impressions) : null,
      deltaClicksPct: snapshot ? pctDelta(campaign.clicks, snapshot.clicks) : null,
      deltaCompletionsPct: snapshot ? pctDelta(campaign.completions, snapshot.completions) : null,
    };
  }

  // Same cadence/shape as ProfileService.writeSnapshotsForActiveUsers — one
  // row per ACTIVE campaign per day, so getAnalytics can diff "now" against
  // "~7 days ago".
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async writeSnapshotsForActiveCampaigns() {
    const active = await this.prisma.campaign.findMany({ where: { status: 'ACTIVE' } });
    for (const c of active) {
      await this.prisma.campaignMetricsSnapshot.create({
        data: { campaignId: c.id, impressions: c.impressions, clicks: c.clicks, completions: c.completions, spent: c.budget },
      });
    }
    return { snapshotted: active.length };
  }
}
