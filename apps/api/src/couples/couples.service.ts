import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';
import { rankForXp } from '../relationships/relationships.service';

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
  constructor(private prisma: PrismaService) {}

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
    const [templates, completions] = await Promise.all([
      this.prisma.coupleChallengeTemplate.findMany({ orderBy: { level: 'asc' } }),
      this.prisma.coupleChallengeCompletion.findMany({ where: { relationshipId: relationship.id } }),
    ]);
    const completedLevels = new Set(
      completions.map((c) => templates.find((t) => t.id === c.templateId)?.level).filter((l): l is number => !!l),
    );
    const unlockedLevel = completions.length + 1;

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
