import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { AccountType } from '@prisma/client';
import {
  AppRevenueEntry,
  GiftStatsInput,
  SocialStatsInput,
  StoryStatsInput,
  VideoStatsInput,
} from './dto/narrate-business-insights.dto';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_NARRATED_APPS = 5;

export interface AppInsight {
  id: string;
  label: string;
  revenue: number;
  deltaPct: number | null;
  text: string;
}

export interface NarrationResult {
  overall: { text: string; totalRevenue: number; deltaPct: number | null };
  apps: AppInsight[];
  engagement: { text: string; deltaPct: number | null } | null;
  generatedByAi: boolean;
}

// Rounds to one decimal place — matches the "23.4%" -> "23%"-ish precision a
// human would actually say out loud, and gives the AI-output validator a
// stable value to compare spoken percentages against.
function pctDelta(curr: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined) return null;
  // A zero baseline can't express a meaningful percentage change (division
  // by zero, or "infinite%" for any nonzero curr) — narrate the absolute
  // value honestly instead of inventing a number here.
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function clampStr(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max);
}

function deltaSentence(subject: string, deltaPct: number | null, currentText: string): string {
  if (deltaPct === null) return `${subject} currently at ${currentText} — building up week-over-week history.`;
  if (deltaPct > 0) return `${subject} up ${deltaPct}% this week, now at ${currentText}.`;
  if (deltaPct < 0) return `${subject} down ${Math.abs(deltaPct)}% this week, now at ${currentText}.`;
  return `${subject} steady this week at ${currentText}.`;
}

@Injectable()
export class BusinessInsightsService {
  private readonly logger = new Logger(BusinessInsightsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
    private featureFlags: FeatureFlagsService,
  ) {}

  // ── Account type ─────────────────────────────────────────────────────

  async getAccountTypeOverride(userId: string): Promise<AccountType | null> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    return profile?.accountTypeOverride ?? null;
  }

  async setAccountTypeOverride(userId: string, accountType?: AccountType): Promise<AccountType | null> {
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, accountTypeOverride: accountType ?? null },
      update: { accountTypeOverride: accountType ?? null },
    });
    return accountType ?? null;
  }

  // ── Narration ─────────────────────────────────────────────────────────

  async narrate(
    userId: string,
    input: {
      apps: AppRevenueEntry[];
      social?: SocialStatsInput;
      video?: VideoStatsInput;
      story?: StoryStatsInput;
      gifts?: GiftStatsInput;
    },
  ): Promise<NarrationResult> {
    // Sanitize every incoming number defensively — this is client-supplied
    // (albeit the client's own real, already-fetched data), and this
    // endpoint's entire contract is "never let an invented number reach the
    // AI prompt or a snapshot row".
    const apps = (Array.isArray(input.apps) ? input.apps : [])
      .filter((a) => a && typeof a.id === 'string')
      .slice(0, 30)
      .map((a) => ({ id: clampStr(a.id, 60), label: clampStr(a.label, 80) || a.id, revenue: Math.max(0, n(a.revenue)) }));

    const totalRevenue = apps.reduce((sum, a) => sum + a.revenue, 0);
    const postCount = input.social ? Math.max(0, n(input.social.postCount)) : 0;
    const videoViews = input.video ? Math.max(0, n(input.video.totalViews)) : 0;
    const storyEngagement = input.story
      ? Math.max(0, n(input.story.likesReceived) + n(input.story.commentsReceived) + n(input.story.ranksReceived))
      : 0;
    const giftsReceivedTotal = input.gifts ? Math.max(0, n(input.gifts.totalReceived)) : 0;

    const compareSnap = await this.writeSnapshotAndFindComparison(userId, {
      totalRevenue,
      perAppRevenue: apps,
      postCount,
      videoViews,
      storyEngagement,
      giftsReceivedTotal,
    });

    const revenueDeltaPct = pctDelta(totalRevenue, compareSnap?.totalRevenue);
    const priorApps = Array.isArray(compareSnap?.perAppRevenue) ? (compareSnap!.perAppRevenue as any[]) : [];
    const priorRevenueById = new Map<string, number>(priorApps.map((a) => [a.id, n(a.revenue)]));

    // Engagement composite for a single secondary narrated line — posts +
    // video views + story engagement, only when at least one is present, so
    // a purely-commerce account (no social/video/story activity) doesn't get
    // a hollow "0 engagement" line.
    const hasEngagementData = !!input.social || !!input.video || !!input.story;
    const engagementScore = postCount + videoViews + storyEngagement;
    const priorEngagementScore = compareSnap
      ? compareSnap.postCount + compareSnap.videoViews + compareSnap.storyEngagement
      : null;
    const engagementDeltaPct = hasEngagementData ? pctDelta(engagementScore, priorEngagementScore) : null;

    const topApps = [...apps].filter((a) => a.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, MAX_NARRATED_APPS);
    const appDeltas = topApps.map((a) => ({ ...a, deltaPct: pctDelta(a.revenue, priorRevenueById.get(a.id)) }));

    const deterministic = this.buildDeterministic(totalRevenue, revenueDeltaPct, appDeltas, hasEngagementData, engagementScore, engagementDeltaPct);

    const access = await this.featureFlags.getAccess('ai');
    if (access === 'OFF') {
      this.logger.log('Business insight narration skipped — "ai" feature flag is OFF; using deterministic phrasing');
      return { ...deterministic, generatedByAi: false };
    }

    try {
      const ai = await this.tryNarrateWithAi(totalRevenue, revenueDeltaPct, appDeltas, hasEngagementData, engagementScore, engagementDeltaPct);
      return ai ?? { ...deterministic, generatedByAi: false };
    } catch (e: any) {
      this.logger.warn(`AI business insight narration failed, falling back to deterministic phrasing: ${e.message ?? e}`);
      return { ...deterministic, generatedByAi: false };
    }
  }

  private buildDeterministic(
    totalRevenue: number,
    revenueDeltaPct: number | null,
    appDeltas: { id: string; label: string; revenue: number; deltaPct: number | null }[],
    hasEngagementData: boolean,
    engagementScore: number,
    engagementDeltaPct: number | null,
  ): Omit<NarrationResult, 'generatedByAi'> {
    const overallText = deltaSentence('Total earnings across your mini apps are', revenueDeltaPct, `${totalRevenue.toFixed(2)} MSH`);
    const apps: AppInsight[] = appDeltas.map((a) => ({
      id: a.id,
      label: a.label,
      revenue: a.revenue,
      deltaPct: a.deltaPct,
      text: deltaSentence(`Your ${a.label} earnings are`, a.deltaPct, `${a.revenue.toFixed(2)} MSH`),
    }));
    const engagement = hasEngagementData
      ? { text: deltaSentence('Your overall engagement is', engagementDeltaPct, `${engagementScore} touchpoints`), deltaPct: engagementDeltaPct }
      : null;
    return { overall: { text: overallText, totalRevenue, deltaPct: revenueDeltaPct }, apps, engagement };
  }

  private async tryNarrateWithAi(
    totalRevenue: number,
    revenueDeltaPct: number | null,
    appDeltas: { id: string; label: string; revenue: number; deltaPct: number | null }[],
    hasEngagementData: boolean,
    engagementScore: number,
    engagementDeltaPct: number | null,
  ): Promise<NarrationResult | null> {
    const deterministic = this.buildDeterministic(totalRevenue, revenueDeltaPct, appDeltas, hasEngagementData, engagementScore, engagementDeltaPct);
    if (appDeltas.length === 0 && !hasEngagementData) return { ...deterministic, generatedByAi: false };

    const fmtDelta = (d: number | null) => (d === null ? 'no history yet — do not state a percentage, just the value' : `${d > 0 ? '+' : ''}${d}%`);
    const lines: string[] = [
      `Total mini-app earnings: ${totalRevenue.toFixed(2)} MSH (week-over-week: ${fmtDelta(revenueDeltaPct)})`,
      ...appDeltas.map((a) => `${a.label} (id="${a.id}") earnings: ${a.revenue.toFixed(2)} MSH (week-over-week: ${fmtDelta(a.deltaPct)})`),
    ];
    if (hasEngagementData) {
      lines.push(`Overall engagement score (posts + video views + story engagement): ${engagementScore} (week-over-week: ${fmtDelta(engagementDeltaPct)})`);
    }

    const appIds = appDeltas.map((a) => a.id);
    const system = `You write short, natural business-insight narrations for mini-app owners on the Guranda app's Business Dashboard — the kind of line a smart co-founder would say out loud, e.g. "Your Salon bookings are up 23% this week." You will be given REAL, already-computed numbers below, including any real week-over-week percentage change. Rules, no exceptions: (1) Use ONLY the numbers given — never invent, estimate, or restate a percentage that isn't listed verbatim. (2) When a stat says "no history yet", describe only the current value as an observation — never claim a trend or a percentage for it. (3) Never mention a mini app or stat not listed below. (4) Keep each sentence under 200 characters, encouraging but factual, one sentence per insight. Always call narrate_business_insights — never respond with plain text.`;
    const userMsg = `Here are the real numbers:\n${lines.join('\n')}\n\nWrite one overall insight sentence, and (if any apps are listed) one insight sentence per app.`;

    const result = await this.llm.runTurn({
      system,
      messages: [{ role: 'user', content: userMsg }],
      tools: [
        {
          name: 'narrate_business_insights',
          description: 'Submit the narrated business insight sentences.',
          inputSchema: {
            type: 'object',
            properties: {
              overall: { type: 'string' },
              apps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', enum: appIds.length ? appIds : undefined },
                    text: { type: 'string' },
                  },
                  required: ['id', 'text'],
                },
              },
              engagement: { type: 'string' },
            },
            required: ['overall'],
          },
        },
      ],
    });

    const call = result.toolCalls.find((c) => c.name === 'narrate_business_insights');
    if (!call?.input) return null;

    // Allowed set of percentages the AI is permitted to have said out loud —
    // anything else appearing in its text means it computed or invented its
    // own number, and that specific sentence gets discarded in favor of the
    // deterministic one. This is the actual anti-hallucination guardrail,
    // not just prompt instructions.
    const allowedPercents = new Set<number>(
      [revenueDeltaPct, engagementDeltaPct, ...appDeltas.map((a) => a.deltaPct)].filter((d): d is number => d !== null).map((d) => Math.round(Math.abs(d))),
    );
    const textIsSafe = (text: string): boolean => {
      const matches = [...text.matchAll(/(-?\d+(?:\.\d+)?)\s?%/g)];
      if (matches.length === 0) return true;
      return matches.every((m) => {
        const val = Math.round(Math.abs(Number(m[1])));
        // ±1 tolerance for the model rounding 23.4 to "23" or "24".
        return [...allowedPercents].some((allowed) => Math.abs(allowed - val) <= 1);
      });
    };

    const overallRaw = typeof call.input.overall === 'string' ? call.input.overall.slice(0, 300) : '';
    const overallText = overallRaw && textIsSafe(overallRaw) ? overallRaw : deterministic.overall.text;

    const rawApps: any[] = Array.isArray(call.input.apps) ? call.input.apps : [];
    const apps: AppInsight[] = appDeltas.map((a) => {
      const fromAi = rawApps.find((r) => r?.id === a.id);
      const text = typeof fromAi?.text === 'string' && textIsSafe(fromAi.text) ? fromAi.text.slice(0, 300) : deterministic.apps.find((d) => d.id === a.id)!.text;
      return { id: a.id, label: a.label, revenue: a.revenue, deltaPct: a.deltaPct, text };
    });

    let engagement = deterministic.engagement;
    if (hasEngagementData) {
      const engagementRaw = typeof call.input.engagement === 'string' ? call.input.engagement.slice(0, 300) : '';
      engagement = { text: engagementRaw && textIsSafe(engagementRaw) ? engagementRaw : deterministic.engagement!.text, deltaPct: engagementDeltaPct };
    }

    return {
      overall: { text: overallText, totalRevenue, deltaPct: revenueDeltaPct },
      apps,
      engagement,
      generatedByAi: true,
    };
  }

  // ── Snapshot mechanism (mirrors ProfileService's ProfileMetricsSnapshot
  //    cron pattern: one row per user per day, diffed against the row
  //    closest to ~7 days ago) ────────────────────────────────────────────

  private async writeSnapshotAndFindComparison(
    userId: string,
    metrics: {
      totalRevenue: number;
      perAppRevenue: { id: string; label: string; revenue: number }[];
      postCount: number;
      videoViews: number;
      storyEngagement: number;
      giftsReceivedTotal: number;
    },
  ) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existingToday = await this.prisma.businessMetricsSnapshot.findFirst({
      where: { userId, capturedAt: { gte: startOfToday } },
    });
    // Only one snapshot per user per day — every dashboard load/refresh
    // calling narrate() shouldn't spam a new row; the first call of the day
    // captures it, later calls that day just read comparisons.
    if (!existingToday) {
      await this.prisma.businessMetricsSnapshot.create({
        data: {
          userId,
          totalRevenue: metrics.totalRevenue,
          perAppRevenue: metrics.perAppRevenue,
          postCount: metrics.postCount,
          videoViews: metrics.videoViews,
          storyEngagement: metrics.storyEngagement,
          giftsReceivedTotal: metrics.giftsReceivedTotal,
        },
      });
    }

    const weekAgo = new Date(Date.now() - WEEK_MS);
    return this.prisma.businessMetricsSnapshot.findFirst({
      where: { userId, capturedAt: { lte: weekAgo } },
      orderBy: { capturedAt: 'desc' },
    });
  }
}
