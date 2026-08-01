import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';
import { rankForXp } from '../relationships/relationships.service';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';

// Seeded once on boot, same upsert-by-stable-key pattern as
// AchievementsService.onModuleInit()'s DEFAULT_ACHIEVEMENTS.
const DEFAULT_TEMPLATES: { level: number; title: string; description: string; instructions?: string; xpReward: number }[] = [
  { level: 1, title: 'Play Ludo Together', description: 'Play a round of Ludo together in the Games hub — winner picks a small gift.', xpReward: 50 },
  { level: 2, title: 'Live Selfie & Appreciation', description: 'Send a live selfie and share one thing you appreciate about your partner.', xpReward: 60 },
  { level: 3, title: 'Couples Quiz', description: 'Complete a couples quiz together and compare your answers.', xpReward: 70 },
  { level: 4, title: 'Truth or Dare', description: 'Play a round of Truth or Dare with your partner.', xpReward: 80 },
  { level: 5, title: 'Plan a Date Night', description: 'Plan and share the details of an upcoming date night together.', xpReward: 90 },
  { level: 6, title: 'Record a Dance Together', description: 'Record and share a short dance video together.', xpReward: 100 },
  { level: 7, title: 'Surprise Challenge', description: 'A surprise challenge just for the two of you.', xpReward: 120 },
  { level: 8, title: 'Write Each Other a Letter', description: 'Write a short letter to your partner about what they mean to you.', xpReward: 140 },
  { level: 9, title: 'Recreate Your First Date', description: 'Recreate your first date together, wherever you are.', xpReward: 160 },
  { level: 10, title: 'Dream Big Together', description: 'Share a dream or goal you want to achieve together this year.', xpReward: 180 },
];

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class CouplesService implements OnModuleInit {
  private readonly logger = new Logger(CouplesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
  ) {}

  async onModuleInit() {
    for (const t of DEFAULT_TEMPLATES) {
      await this.prisma.coupleChallengeTemplate.upsert({
        where: { level: t.level },
        create: t,
        update: { title: t.title, description: t.description, instructions: t.instructions, xpReward: t.xpReward },
      });
    }
  }

  private async myActiveRelationship(userId: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
    });
    if (!relationship) throw new BadRequestException('You need an accepted relationship to access Couples Challenges');
    return relationship;
  }

  async getChallenges(userId: string) {
    const relationship = await this.myActiveRelationship(userId);
    let templates = await this.prisma.coupleChallengeTemplate.findMany({ orderBy: { level: 'asc' } });
    const completions = await this.prisma.coupleChallengeCompletion.findMany({ where: { relationshipId: relationship.id } });
    const unlockedLevel = completions.length + 1;

    // The 10 seeded levels are a starting curated set, not a hard ceiling —
    // a couple should never run out of challenges. Once they've cleared
    // everything we have, mint the next level on demand so there's always
    // a "next" challenge waiting, same continuity guarantee as individual
    // Challenges getting a daily refill.
    if (unlockedLevel > templates.length) {
      await this.ensureTemplateForLevel(unlockedLevel, templates);
      templates = await this.prisma.coupleChallengeTemplate.findMany({ orderBy: { level: 'asc' } });
    }

    const completedLevels = new Set(
      completions.map((c) => templates.find((t) => t.id === c.templateId)?.level).filter((l): l is number => !!l),
    );

    return {
      relationship: { ...relationship, rank: rankForXp(relationship.xp) },
      templates: templates.map((t) => {
        const completion = completions.find((c) => c.templateId === t.id);
        return {
          ...t,
          status: completedLevels.has(t.level) ? 'completed' : t.level === unlockedLevel ? 'unlocked' : 'locked',
          completedAt: completion?.completedAt ?? null,
          note: completion?.note ?? null,
        };
      }),
    };
  }

  /** Mints one more CoupleChallengeTemplate via AI, or a generic fallback if AI is unavailable — never leaves a couple without a next level. */
  private async ensureTemplateForLevel(level: number, existing: { title: string }[]) {
    try {
      const result = await this.llm.runTurn({
        system: `You invent short, fun, achievable challenges for couples on the Guranda app. This is level ${level} of an ever-growing progression — later levels can lean a bit more creative or ambitious than earlier ones, but should still be doable in a day. Never repeat any of these existing titles: ${existing.map((t) => t.title).join(', ')}. Always call propose_couple_challenge with your idea.`,
        messages: [{ role: 'user', content: `Generate the level ${level} couple challenge now.` }],
        tools: [
          {
            name: 'propose_couple_challenge',
            description: 'Submit the new couple challenge idea.',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                xpReward: { type: 'number' },
              },
              required: ['title', 'description', 'xpReward'],
            },
          },
        ],
      });
      const call = result.toolCalls.find((c) => c.name === 'propose_couple_challenge');
      const p = call?.input as any;
      if (!p?.title || !p?.description) throw new Error('AI returned no usable proposal');
      await this.prisma.coupleChallengeTemplate.upsert({
        where: { level },
        create: {
          level,
          title: String(p.title).slice(0, 150),
          description: String(p.description).slice(0, 2000),
          xpReward: Number.isFinite(p.xpReward) ? Math.max(0, Math.round(p.xpReward)) : 150 + level * 5,
        },
        update: {},
      });
    } catch (e: any) {
      this.logger.warn(`AI couple-challenge generation failed for level ${level}, using a fallback: ${e.message ?? e}`);
      await this.prisma.coupleChallengeTemplate.upsert({
        where: { level },
        create: {
          level,
          title: `Surprise Challenge #${level}`,
          description: 'Surprise your partner with something thoughtful today, then share it together.',
          xpReward: 150 + level * 5,
        },
        update: {},
      });
    }
  }

  async complete(userId: string, templateId: string, note?: string) {
    const relationship = await this.myActiveRelationship(userId);
    const template = await this.prisma.coupleChallengeTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Challenge level not found');

    const completedCount = await this.prisma.coupleChallengeCompletion.count({
      where: { relationshipId: relationship.id },
    });
    if (template.level !== completedCount + 1) {
      throw new BadRequestException('Complete the earlier levels first');
    }

    const completion = await this.prisma.coupleChallengeCompletion.create({
      data: { relationshipId: relationship.id, templateId, completedByUserId: userId, note },
    });

    await this.advanceRelationshipStreak(relationship);
    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: { xp: { increment: template.xpReward } },
    });

    return completion;
  }

  // Same daily-streak logic as ChallengesService.advanceStreak, applied to
  // the couple's shared Relationship row instead of a per-user table.
  private async advanceRelationshipStreak(relationship: { id: string; currentStreak: number; longestStreak: number; lastActivityDate: Date | null }) {
    const today = todayDateOnly();
    const last = relationship.lastActivityDate;
    const diffDays = last ? Math.round((today.getTime() - last.getTime()) / 86_400_000) : null;
    let currentStreak = relationship.currentStreak;
    if (diffDays === 0) return;
    if (diffDays === 1) currentStreak += 1;
    else currentStreak = 1;

    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        currentStreak,
        longestStreak: Math.max(relationship.longestStreak, currentStreak),
        lastActivityDate: today,
      },
    });
  }

  // Daily 21:00 unlock notification — server-driven so it fires even if the
  // app isn't open, rather than relying on a client-side clock check alone.
  @Cron('0 21 * * *')
  async notifyDailyUnlock() {
    const relationships = await this.prisma.relationship.findMany({
      where: { status: 'active' },
      include: {
        userA: { select: { expoPushToken: true } },
        userB: { select: { expoPushToken: true } },
      },
    });
    for (const r of relationships) {
      for (const token of [r.userA.expoPushToken, r.userB.expoPushToken]) {
        if (token) {
          await sendPushNotification(token, 'Your Couple Challenge is Ready ❤️', "Tonight's challenge is waiting for you both.");
        }
      }
    }
  }
}
