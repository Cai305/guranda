import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';
import { NotificationsService } from '../notifications/notifications.service';
import { rankForXp } from '../relationships/relationships.service';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';
import { SEED_PROMPTS, PromptType, SpiceLevelSeed } from './couple-prompts.data';

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
  // Extends past level 10 — the unlock/never-runs-dry logic already
  // generates past this point; these are hand-authored levels rather than
  // AI-generated ones, matching the request for a broader conversation-game
  // catalog (Would You Rather, Spin the Bottle, Cards).
  { level: 11, title: 'Would You Rather', description: 'Take turns asking each other "Would you rather..." questions — no repeats, no skipping.', xpReward: 90 },
  { level: 12, title: 'Spin the Bottle', description: 'Play a two-player round of Spin the Bottle — winner picks the next dare.', xpReward: 100 },
  { level: 13, title: 'Card Game Night', description: 'Play a round of 5 Cards or Cassino together in the Games hub.', xpReward: 100 },
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
    private notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    for (const t of DEFAULT_TEMPLATES) {
      await this.prisma.coupleChallengeTemplate.upsert({
        where: { level: t.level },
        create: t,
        update: { title: t.title, description: t.description, instructions: t.instructions, xpReward: t.xpReward },
      });
    }
    await this.seedPrompts();
  }

  // Only seeds a (type, level) pool the first time it's empty — re-running
  // this on every boot must never duplicate rows, and CouplePrompt has no
  // natural unique key to upsert against (free-text content), so an
  // empty-pool check is the idempotency guard here instead.
  private async seedPrompts() {
    for (const type of Object.keys(SEED_PROMPTS) as PromptType[]) {
      for (const level of Object.keys(SEED_PROMPTS[type]) as SpiceLevelSeed[]) {
        const existing = await this.prisma.couplePrompt.count({ where: { type, spiceLevel: level } });
        if (existing > 0) continue;
        await this.prisma.couplePrompt.createMany({
          data: SEED_PROMPTS[type][level].map((text) => ({ type, spiceLevel: level, text })),
        });
      }
    }
  }

  private async myActiveRelationship(userId: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
    });
    if (!relationship) throw new BadRequestException('You need an accepted relationship to access Couples Challenges');
    return relationship;
  }

  private isAdult(dateOfBirth: Date | null | undefined): boolean {
    if (!dateOfBirth) return false;
    const now = new Date();
    let age = now.getFullYear() - dateOfBirth.getFullYear();
    const hadBirthdayThisYear =
      now.getMonth() > dateOfBirth.getMonth() ||
      (now.getMonth() === dateOfBirth.getMonth() && now.getDate() >= dateOfBirth.getDate());
    if (!hadBirthdayThisYear) age -= 1;
    return age >= 18;
  }

  // SPICY only ever unlocks once BOTH partners have opted in AND both have
  // a verified 18+ dateOfBirth on file — self-reported opt-in alone isn't
  // enough for adult content, and one partner can't unlock it unilaterally.
  private async isSpicyUnlocked(relationship: { userAId: string; userBId: string; spicyOptInA: boolean; spicyOptInB: boolean }) {
    if (!relationship.spicyOptInA || !relationship.spicyOptInB) return false;
    const [verA, verB] = await Promise.all([
      this.prisma.verification.findUnique({ where: { userId: relationship.userAId } }),
      this.prisma.verification.findUnique({ where: { userId: relationship.userBId } }),
    ]);
    return (
      verA?.status === 'VERIFIED' && this.isAdult(verA.dateOfBirth) &&
      verB?.status === 'VERIFIED' && this.isAdult(verB.dateOfBirth)
    );
  }

  async getSpiceSettings(userId: string) {
    const relationship = await this.myActiveRelationship(userId);
    const isUserA = relationship.userAId === userId;
    const myOptIn = isUserA ? relationship.spicyOptInA : relationship.spicyOptInB;
    const partnerOptIn = isUserA ? relationship.spicyOptInB : relationship.spicyOptInA;
    const spicyUnlocked = await this.isSpicyUnlocked(relationship);
    return {
      spiceLevel: relationship.spiceLevel,
      myOptIn,
      partnerOptIn,
      spicyUnlocked,
    };
  }

  async setSpiceLevel(userId: string, level: SpiceLevelSeed) {
    const relationship = await this.myActiveRelationship(userId);
    if (level === 'SPICY' && !(await this.isSpicyUnlocked(relationship))) {
      throw new ForbiddenException('Both partners need to opt in and be verified 18+ to unlock Spicy content');
    }
    await this.prisma.relationship.update({ where: { id: relationship.id }, data: { spiceLevel: level } });
    return this.getSpiceSettings(userId);
  }

  async setSpicyOptIn(userId: string, optIn: boolean) {
    const relationship = await this.myActiveRelationship(userId);
    const isUserA = relationship.userAId === userId;
    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: isUserA ? { spicyOptInA: optIn } : { spicyOptInB: optIn },
    });
    return this.getSpiceSettings(userId);
  }

  // Draws one unseen prompt of `type` at the couple's current spice level,
  // reshuffling (clearing seen rows for that type+level) once the pool is
  // exhausted, like a shuffled deck running out and getting reshuffled.
  // Re-validates SPICY eligibility here too, not just at set-level time — a
  // partner can revoke their opt-in at any moment, and this must reflect
  // that on the very next draw rather than the stale relationship.spiceLevel.
  async drawPrompt(userId: string, type: PromptType) {
    const relationship = await this.myActiveRelationship(userId);
    let level = relationship.spiceLevel as SpiceLevelSeed;
    let downgraded = false;
    if (level === 'SPICY' && !(await this.isSpicyUnlocked(relationship))) {
      level = 'FLIRTY';
      downgraded = true;
    }

    let candidates = await this.prisma.couplePrompt.findMany({
      where: { type, spiceLevel: level, seenBy: { none: { relationshipId: relationship.id } } },
    });

    if (candidates.length === 0) {
      const pool = await this.prisma.couplePrompt.findMany({ where: { type, spiceLevel: level }, select: { id: true } });
      await this.prisma.couplePromptSeen.deleteMany({
        where: { relationshipId: relationship.id, promptId: { in: pool.map((p) => p.id) } },
      });
      candidates = await this.prisma.couplePrompt.findMany({ where: { type, spiceLevel: level } });
    }

    if (candidates.length === 0) throw new NotFoundException('No prompts available for this type yet');
    const prompt = candidates[Math.floor(Math.random() * candidates.length)];

    await this.prisma.couplePromptSeen.upsert({
      where: { relationshipId_promptId: { relationshipId: relationship.id, promptId: prompt.id } },
      create: { relationshipId: relationship.id, promptId: prompt.id },
      update: {},
    });

    return { id: prompt.id, type: prompt.type, spiceLevel: prompt.spiceLevel, text: prompt.text, downgraded };
  }

  // Spin the Bottle — the "spin" picks Truth or Dare at random, then draws
  // a prompt from that pool the same way drawPrompt does.
  async spinBottle(userId: string) {
    const category: PromptType = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
    const prompt = await this.drawPrompt(userId, category);
    return { category, prompt };
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
      for (const userId of [r.userAId, r.userBId]) {
        await this.notifications.create(
          userId,
          'couples.challenge_ready',
          'Your Couple Challenge is Ready ❤️',
          "Tonight's challenge is waiting for you both.",
          { relationshipId: r.id },
        );
      }
    }
  }
}
