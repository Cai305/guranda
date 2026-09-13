import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { getDisplayedReputation, levelRank } from '../users/reputation.util';
import { FranchisesService } from '../franchises/franchises.service';

// Money-on-approval, no escrow — identical pattern to
// ChallengeSponsorshipService: nothing is charged when a campaign is
// created, the full budget is debited in one atomic transaction only when
// an admin approves it.
function pctDelta(curr: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

const BUDGETED_TYPES = ['BUSINESS', 'MINI_APP_LAUNCH'];

// Real per-viewer frequency cap — the same campaign stops being served to a
// viewer who has already seen it this many times within the rolling window
// below. PLATFORM_UPDATE campaigns are exempt: they're one-off product
// announcements ("Guranda v2.4 is here"), not paid reach a viewer should be
// protected from over-exposure to, and capping them would just mean some
// users never learn about the update at all.
const AD_FREQUENCY_CAP = 3;
const AD_FREQUENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private franchises: FranchisesService,
  ) {}

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
    let franchiseUsernameId: string | null = null;

    // Phase 7 — Franchise tenancy, additive: when a franchise location is
    // named, the caller must be authorized to act as THAT alias (its owner,
    // or one of its active staff — see FranchisesService.canActAsAlias),
    // which is a strictly ADDITIONAL gate on top of (never a replacement
    // for) the existing verified-business check below. The franchise's own
    // parent business is what gets billed — same wallet a business-owner-
    // created campaign already uses — so a staff member who isn't
    // personally a verified business owner can still create a campaign
    // scoped to the one location they're staff on.
    if (dto.franchiseUsernameId) {
      const canAct = await this.franchises.canActAsAlias(userId, dto.franchiseUsernameId);
      if (!canAct) {
        throw new ForbiddenException('You are not authorized to create campaigns for that franchise location');
      }
      const franchise = await this.prisma.username.findUnique({ where: { id: dto.franchiseUsernameId } });
      if (!franchise || !franchise.businessId || !franchise.parentUsernameId) {
        throw new BadRequestException('That alias is not a franchise location');
      }
      franchiseUsernameId = franchise.id;
      businessId = franchise.businessId;
    }

    if (BUDGETED_TYPES.includes(dto.type)) {
      if (!businessId) {
        const business = await this.findEligibleBusiness(userId);
        if (!business) {
          throw new ForbiddenException('Only verified business accounts can create this campaign type');
        }
        businessId = business.id;
      }
      if (!(dto.budget && dto.budget > 0)) {
        throw new BadRequestException('budget must be a positive amount for this campaign type');
      }
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
        budget: businessId ? dto.budget ?? 0 : 0,
        targetMinReputationLevel: dto.targetMinReputationLevel,
        targetCategories: dto.targetCategories ?? [],
        createdByUserId: userId,
        createdByBusinessId: businessId,
        franchiseUsernameId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: 'PENDING',
      },
    });
  }

  async getById(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { createdByBusiness: true, franchiseUsername: { select: { id: true, label: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  listMine(userId: string) {
    return this.prisma.campaign.findMany({
      where: { createdByUserId: userId },
      include: { franchiseUsername: { select: { id: true, label: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Public discovery feed for the mixed Explore/Immersive stream — same
  // ACTIVE + not-expired + audience-eligibility filter as
  // OpportunitiesService.getFeed, but cursor-paginated (createdAt, same
  // reasoning as PostsService.getFeed: Campaign.id is a random UUID, not
  // sortable) instead of a fixed top-N, since this feed needs real
  // continuation as the user scrolls, not just a rotating carousel's top 4.
  async getFeed(userId: string, take = 10, cursor?: string) {
    const viewerLevel = (await getDisplayedReputation(this.prisma, userId)).level;
    const viewerRank = levelRank(viewerLevel);

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        endAt: { gt: new Date() },
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: { createdByBusiness: true, franchiseUsername: { select: { id: true, label: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const reputationEligible = campaigns.filter((c) => {
      if (!c.targetMinReputationLevel) return true;
      return viewerRank >= levelRank(c.targetMinReputationLevel);
    });

    // Real per-viewer frequency cap (see AD_FREQUENCY_CAP) — PLATFORM_UPDATE
    // campaigns are exempt, everything else drops out of this viewer's feed
    // once they've already been served it AD_FREQUENCY_CAP times in the
    // last AD_FREQUENCY_WINDOW_MS, same way an over-exposed ad would stop
    // showing on any real ad platform.
    const cappableIds = reputationEligible.filter((c) => c.type !== 'PLATFORM_UPDATE').map((c) => c.id);
    const overCapped = new Set<string>();
    if (cappableIds.length > 0) {
      const counts = await this.prisma.campaignImpression.groupBy({
        by: ['campaignId'],
        where: {
          userId,
          campaignId: { in: cappableIds },
          seenAt: { gte: new Date(Date.now() - AD_FREQUENCY_WINDOW_MS) },
        },
        _count: { _all: true },
      });
      for (const row of counts) {
        if (row._count._all >= AD_FREQUENCY_CAP) overCapped.add(row.campaignId);
      }
    }
    const eligible = reputationEligible.filter((c) => !overCapped.has(c.id));

    const nextCursor = campaigns.length < take ? null : campaigns[campaigns.length - 1].createdAt.toISOString();
    return { campaigns: eligible, nextCursor };
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

  async trackImpression(campaignId: string, userId: string) {
    const [campaign] = await this.prisma.$transaction([
      this.prisma.campaign.update({ where: { id: campaignId }, data: { impressions: { increment: 1 } } }),
      this.prisma.campaignImpression.create({ data: { campaignId, userId } }),
    ]);
    return campaign;
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
