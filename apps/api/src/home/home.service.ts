import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';

const STALE_AFTER_MS = 30 * 60 * 1000; // 30 minutes — matches n8n's refresh cadence
const COLD_START_WINDOW_MS = 24 * 60 * 60 * 1000; // account younger than this = onboarding framing

const BRIEFING_SYSTEM_PROMPT = `You write a one-to-two sentence "briefing" for the home screen of Guranda, a South African super-app. You are given a JSON object of real facts about one user's account right now — this JSON is your ONLY source of truth.

Hard rules:
- Only describe facts that are literally present as non-zero/non-null values in the JSON. Do not add a second sentence just to fill space.
- NEVER invent or reference: app versions, release names, feature announcements, dates, places, people, or anything else not in the JSON. If you are tempted to add color or context beyond the JSON, delete that sentence instead.
- Do not use marketing language ("exciting", "amazing", "don't miss out") or generic filler ("take a moment to explore"). Every sentence must be traceable to a specific field in the JSON.
- No markdown, no headers, no bullet points — plain conversational sentences, like a text message from a helpful assistant.
- Prioritize the single most actionable or timely fact (an unread message, a closing opportunity) over routine numbers like balance.
- Refer to money as Rand (R) — never "Masheleni" or "MSH".

If the JSON has only routine/background values (e.g. just a balance, nothing time-sensitive), write ONE short factual sentence about that value and stop — do not pad it with unrelated commentary.`;

export interface BriefingResult {
  text: string;
  state: 'personalized' | 'cold_start' | 'empty';
  generatedAt: string;
}

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    private prisma: PrismaService,
    private opportunities: OpportunitiesService,
    private notifications: NotificationsService,
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
  ) {}

  /** Cached read — the fast path Home actually calls on every open. */
  async getBriefing(userId: string): Promise<BriefingResult> {
    const existing = await this.prisma.homeBriefing.findUnique({ where: { userId } });
    if (existing && Date.now() - existing.generatedAt.getTime() < STALE_AFTER_MS) {
      return { text: existing.text, state: existing.state as BriefingResult['state'], generatedAt: existing.generatedAt.toISOString() };
    }
    // Stale or missing — generate live so a user n8n hasn't reached yet
    // (or whose cache just expired) never sees a permanently blank briefing.
    return this.generateBriefing(userId);
  }

  /** Real facts only — every value here is a direct read, nothing invented. */
  private async gatherFacts(userId: string) {
    const [user, wallet, unreadNotifications, recentAchievements, opportunitiesFeed, unreadChats] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, profile: { select: { displayName: true } } } }),
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.notifications.unreadCount(userId),
      this.prisma.userAchievement.findMany({
        where: { userId, unlockedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        include: { achievement: { select: { name: true } } },
        orderBy: { unlockedAt: 'desc' },
        take: 3,
      }).catch(() => [] as any[]), // unlockedAt may not exist on every deployment's snapshot — degrade gracefully, never crash the briefing
      this.opportunities.getFeed(userId).catch(() => [] as any[]),
      this.prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true, lastReadAt: true },
        take: 50,
      }),
    ]);

    let unreadMessageChats = 0;
    if (unreadChats.length > 0) {
      const counts = await Promise.all(
        unreadChats.map((m) =>
          this.prisma.message.count({ where: { chatId: m.chatId, senderId: { not: userId }, createdAt: { gt: m.lastReadAt } } }),
        ),
      );
      unreadMessageChats = counts.filter((c) => c > 0).length;
    }

    const topOpportunity = (opportunitiesFeed as any[])[0] ?? null;

    return {
      displayName: user?.profile?.displayName ?? null,
      accountCreatedAt: user?.createdAt ?? null,
      balanceRand: wallet?.balanceMasheleni ?? 0,
      unreadNotifications,
      unreadMessageChats,
      recentAchievements: recentAchievements.map((a: any) => a.achievement?.name).filter(Boolean),
      topOpportunityTitle: topOpportunity?.title ?? null,
      topOpportunityAction: topOpportunity?.actionLabel ?? null,
    };
  }

  // Deliberately NOT `balanceRand > 0` — every new account starts with a
  // grant balance, so that alone would make hasSignal permanently true and
  // the cold_start/empty states unreachable. A balance only becomes a real
  // "signal" as a *delta* (money moved), which this snapshot doesn't track —
  // it's passed to the LLM as context either way, just not as a trigger.
  private hasSignal(facts: Awaited<ReturnType<HomeService['gatherFacts']>>): boolean {
    return (
      facts.unreadNotifications > 0 ||
      facts.unreadMessageChats > 0 ||
      facts.recentAchievements.length > 0 ||
      !!facts.topOpportunityTitle
    );
  }

  /** Live generation — used for a stale/missing cache, and by refreshAllActive() below. */
  async generateBriefing(userId: string): Promise<BriefingResult> {
    const facts = await this.gatherFacts(userId);

    // Nothing real to say — never invent content to fill the space (matches
    // Phase 7.4's "an honest short line, never a fabricated briefing").
    if (!this.hasSignal(facts)) {
      const isNew = facts.accountCreatedAt && Date.now() - facts.accountCreatedAt.getTime() < COLD_START_WINDOW_MS;
      const state = isNew ? 'cold_start' : 'empty';
      const text = isNew
        ? `Welcome to Guranda${facts.displayName ? `, ${facts.displayName}` : ''} — once you start chatting, playing, or exploring, this is where you'll see what matters most.`
        : "Nothing needs your attention right now — you're all caught up.";
      return this.saveBriefing(userId, text, state);
    }

    let text: string;
    try {
      const result = await this.llm.runTurn({
        system: BRIEFING_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(facts) }],
        tools: [],
      });
      text = result.content.trim();
      if (!text) throw new Error('Empty briefing from LLM');
    } catch (e: any) {
      this.logger.warn(`Briefing generation failed for ${userId}, falling back to a plain summary: ${e.message}`);
      // A real, honest fallback built from the same real facts — never a
      // generic error string shown as if it were a briefing.
      text = this.fallbackText(facts);
    }
    return this.saveBriefing(userId, text, 'personalized');
  }

  private fallbackText(facts: Awaited<ReturnType<HomeService['gatherFacts']>>): string {
    const parts: string[] = [];
    if (facts.unreadMessageChats > 0) parts.push(`${facts.unreadMessageChats} chat${facts.unreadMessageChats > 1 ? 's' : ''} waiting on you`);
    if (facts.topOpportunityTitle) parts.push(`"${facts.topOpportunityTitle}" is available`);
    if (facts.recentAchievements.length) parts.push(`you unlocked ${facts.recentAchievements[0]}`);
    if (parts.length === 0) parts.push(`your balance is R${facts.balanceRand.toFixed(2)}`);
    return parts.join(', ') + '.';
  }

  private async saveBriefing(userId: string, text: string, state: BriefingResult['state']): Promise<BriefingResult> {
    const row = await this.prisma.homeBriefing.upsert({
      where: { userId },
      create: { userId, text, state },
      update: { text, state, generatedAt: new Date() },
    });
    return { text: row.text, state: row.state as BriefingResult['state'], generatedAt: row.generatedAt.toISOString() };
  }

  /**
   * n8n's entry point (POST /home/briefing/refresh-all, behind AdminAccessGuard
   * — same x-admin-key convention every other server-to-server caller uses).
   * Pre-computes briefings for recently-active users so their next Home open
   * reads the cache instantly instead of blocking on a live LLM call — see
   * Phase 7.5: "pre-computing the briefing ahead of open... never blocks on
   * live generation."
   */
  async refreshAllActive(): Promise<{ refreshed: number; failed: number }> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUserIds = await this.prisma.message.findMany({
      where: { createdAt: { gte: since } },
      distinct: ['senderId'],
      select: { senderId: true },
      take: 2000,
    });
    const ids = [...new Set(recentUserIds.map((r) => r.senderId))];

    let refreshed = 0;
    let failed = 0;
    for (const userId of ids) {
      try {
        await this.generateBriefing(userId);
        refreshed++;
      } catch (e: any) {
        this.logger.warn(`Failed to refresh briefing for ${userId}: ${e.message}`);
        failed++;
      }
    }
    return { refreshed, failed };
  }
}
