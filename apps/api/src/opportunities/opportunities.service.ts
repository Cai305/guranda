import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChallengesService } from '../challenges/challenges.service';
import { getDisplayedReputation, levelLadder } from '../users/reputation.util';

const CAMPAIGN_SUBTITLE: Record<string, string> = {
  BUSINESS: 'Sponsored',
  MINI_APP_LAUNCH: 'New Mini App',
  PLATFORM_UPDATE: 'Platform Update',
  CREATOR_PROMO: 'Creator Promo',
  REVIEWER_RECOMMENDATION: 'Recommended',
};

function levelRank(level: string | null | undefined): number {
  if (!level) return -1;
  const ladder = levelLadder();
  const idx = ladder.findIndex((t) => t.level === level);
  return idx === -1 ? -1 : idx;
}

// Aggregates the two very different "things to do for a reward" surfaces —
// business Campaigns (paid, contract-like) and community Challenges
// (free, fun) — into one unified card feed for the mobile Opportunities
// Carousel. Mirrors trending.module.ts's standalone-aggregator pattern to
// avoid a circular import between Campaigns and Challenges.
@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private challenges: ChallengesService,
  ) {}

  async getFeed(viewerId?: string) {
    const viewerLevel = viewerId ? (await getDisplayedReputation(this.prisma, viewerId)).level : null;
    const viewerRank = levelRank(viewerLevel);

    const [campaigns, missions] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { status: 'ACTIVE', endAt: { gt: new Date() } },
        include: { createdByBusiness: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.challenges.getTrendingChallenges(6),
    ]);

    const eligibleCampaigns = campaigns.filter((c) => {
      // Audience targeting only — never gates who can CREATE a campaign.
      // No target = visible to everyone.
      if (!c.targetMinReputationLevel) return true;
      return viewerRank >= levelRank(c.targetMinReputationLevel);
    });

    const campaignCards = eligibleCampaigns.slice(0, 4).map((c) => ({
      id: c.id,
      origin: 'campaign' as const,
      type: c.type,
      title: c.title,
      subtitle: CAMPAIGN_SUBTITLE[c.type] ?? 'Campaign',
      rewardLabel: c.rewardLabel,
      estimatedMinutes: c.estimatedMinutes,
      actionLabel: c.actionLabel,
      actionRoute: c.actionRoute,
      coverImageUrl: c.coverImageUrl,
      sponsorLabel: c.createdByBusiness?.name ?? null,
    }));

    const missionCards = missions.map((m) => ({
      id: m.id,
      origin: 'mission' as const,
      type: m.category,
      title: m.title,
      subtitle: 'Community Mission',
      rewardLabel: `${m.xpReward} XP`,
      estimatedMinutes: null,
      actionLabel: 'Join',
      actionRoute: { name: 'ChallengeDetail', params: { challengeId: m.id } },
      coverImageUrl: m.coverImageUrl,
      sponsorLabel: m.sponsorLabel ?? null,
    }));

    return [...campaignCards, ...missionCards];
  }
}
