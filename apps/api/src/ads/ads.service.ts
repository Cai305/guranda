import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ContentRankingService,
  ReputationLevel,
} from '../ranking/content-ranking.service';

// Deliberately minimal — no budget pacing, bidding, or billing. Reach is
// decided by the exact same ContentRankingService used for organic content,
// keyed off the advertiser's own activeUsername reputation + location.
@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private ranking: ContentRankingService,
  ) {}

  createCampaign(
    advertiserId: string,
    dto: { title: string; creativeUrl: string; targetAudience?: string },
  ) {
    if (!dto.title?.trim() || !dto.creativeUrl?.trim()) {
      throw new BadRequestException('Title and creative URL are required');
    }
    return this.prisma.adCampaign.create({
      data: {
        advertiserId,
        title: dto.title.trim(),
        creativeUrl: dto.creativeUrl.trim(),
        targetAudience: dto.targetAudience,
      },
    });
  }

  listMine(advertiserId: string) {
    return this.prisma.adCampaign.findMany({
      where: { advertiserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatus(
    advertiserId: string,
    campaignId: string,
    status: 'ACTIVE' | 'PAUSED' | 'ENDED',
  ) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.advertiserId !== advertiserId)
      throw new ForbiddenException('Not your campaign');
    return this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status },
    });
  }

  async getDelivery(viewerId: string, take = 2) {
    const [campaigns, viewer] = await Promise.all([
      this.prisma.adCampaign.findMany({
        where: { status: 'ACTIVE' },
        include: {
          advertiser: {
            select: {
              id: true,
              username: true,
              locationLat: true,
              locationLng: true,
              profile: { select: { displayName: true, avatarUrl: true } },
              activeUsername: {
                select: { reputationScore: true, level: true },
              },
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { locationLat: true, locationLng: true },
      }),
    ]);

    const ranked = this.ranking.rank(
      campaigns,
      (c) =>
        this.ranking.scoreItem({
          createdAt: c.createdAt,
          authorReputationScore:
            c.advertiser.activeUsername?.reputationScore ?? 0,
          authorLevel:
            (c.advertiser.activeUsername?.level as ReputationLevel) ?? 'Nano',
          authorLat: c.advertiser.locationLat,
          authorLng: c.advertiser.locationLng,
          viewerLat: viewer?.locationLat,
          viewerLng: viewer?.locationLng,
        }),
      take,
    );

    if (ranked.length > 0) {
      await this.prisma.adCampaign.updateMany({
        where: { id: { in: ranked.map((c) => c.id) } },
        data: { impressions: { increment: 1 } },
      });
    }
    return ranked;
  }
}
