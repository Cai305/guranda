import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { AchievementsService } from '../achievements/achievements.service';

const AUTHOR_SELECT = {
  id: true,
  username: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} as const;

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toFlatAuthor(user: any) {
  if (!user) return user;
  const { profile, ...rest } = user;
  return { ...rest, ...profile };
}

@Injectable()
export class ChallengesService {
  constructor(
    private prisma: PrismaService,
    private achievements: AchievementsService,
  ) {}

  // ── Public reads ──────────────────────────────────────────────────────────

  async listActive(category?: string, type?: string) {
    return this.prisma.challenge.findMany({
      where: {
        status: 'ACTIVE',
        ...(category ? { category: category as any } : {}),
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { endAt: 'asc' },
      include: { _count: { select: { entries: true } } },
    });
  }

  async getDetail(challengeId: string, viewerId?: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const entries = await this.prisma.challengeEntry.findMany({
      where: { challengeId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: AUTHOR_SELECT },
        likes: true,
        votes: true,
        _count: { select: { comments: true } },
      },
    });

    return {
      ...challenge,
      entries: entries.map((e) => {
        const { user, likes, votes, _count, ...rest } = e;
        const voteAvg = votes.length ? votes.reduce((s, v) => s + v.value, 0) / votes.length : 0;
        return {
          ...rest,
          user: toFlatAuthor(user),
          likeCount: likes.length,
          isLikedByMe: viewerId ? likes.some((l) => l.userId === viewerId) : false,
          voteCount: votes.length,
          voteAverage: voteAvg,
          myVote: viewerId ? votes.find((v) => v.userId === viewerId)?.value ?? null : null,
          commentCount: _count.comments,
        };
      }),
    };
  }

  async getEntryComments(entryId: string) {
    const entry = await this.prisma.challengeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');
    const comments = await this.prisma.challengeEntryComment.findMany({
      where: { entryId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return comments.map((c) => ({ ...c, author: toFlatAuthor(c.author) }));
  }

  // ── Entries ───────────────────────────────────────────────────────────────

  async submitEntry(
    userId: string,
    challengeId: string,
    data: { mediaUrl: string; mediaType: string; caption?: string },
  ) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.status !== 'ACTIVE') {
      throw new BadRequestException('This challenge is not currently active');
    }
    if (!data.mediaUrl || !data.mediaType) {
      throw new BadRequestException('mediaUrl and mediaType are required');
    }

    const existing = await this.prisma.challengeEntry.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    if (existing) throw new BadRequestException('You already submitted an entry for this challenge');

    const entry = await this.prisma.challengeEntry.create({
      data: {
        challengeId,
        userId,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        caption: data.caption,
      },
    });

    await this.prisma.userProfile.update({
      where: { userId },
      data: { xp: { increment: challenge.xpReward } },
    });
    await this.prisma.challengeCategoryStat.upsert({
      where: { userId_category: { userId, category: challenge.category } },
      create: { userId, category: challenge.category, xp: challenge.xpReward, entriesCount: 1 },
      update: { xp: { increment: challenge.xpReward }, entriesCount: { increment: 1 } },
    });
    await this.advanceStreak(userId);
    await this.achievements.evaluateChallengeAchievementsForUser(userId);

    return entry;
  }

  private async advanceStreak(userId: string) {
    const today = todayDateOnly();
    const existing = await this.prisma.userChallengeStreak.findUnique({ where: { userId } });
    if (!existing) {
      await this.prisma.userChallengeStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastCompletedDate: today },
      });
      return;
    }
    const last = existing.lastCompletedDate;
    const diffDays = last ? Math.round((today.getTime() - last.getTime()) / 86_400_000) : null;
    let currentStreak = existing.currentStreak;
    if (diffDays === 0) {
      // already advanced today — no-op
      return;
    } else if (diffDays === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    await this.prisma.userChallengeStreak.update({
      where: { userId },
      data: {
        currentStreak,
        longestStreak: Math.max(existing.longestStreak, currentStreak),
        lastCompletedDate: today,
      },
    });
  }

  // ── Entry interactions ───────────────────────────────────────────────────

  async likeEntry(userId: string, entryId: string) {
    const entry = await this.prisma.challengeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');
    try {
      await this.prisma.challengeEntryLike.create({ data: { entryId, userId } });
      return { status: 'liked' };
    } catch {
      await this.prisma.challengeEntryLike.delete({ where: { entryId_userId: { entryId, userId } } });
      return { status: 'unliked' };
    }
  }

  async voteEntry(userId: string, entryId: string, value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      throw new BadRequestException('Vote must be an integer between 1 and 10');
    }
    const entry = await this.prisma.challengeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.userId === userId) {
      throw new ForbiddenException('You cannot vote on your own entry');
    }
    const vote = await this.prisma.challengeEntryVote.upsert({
      where: { entryId_userId: { entryId, userId } },
      create: { entryId, userId, value },
      update: { value },
    });
    await this.achievements.evaluateChallengeAchievementsForUser(entry.userId);
    return vote;
  }

  async commentOnEntry(userId: string, entryId: string, content: string) {
    if (!content?.trim()) throw new BadRequestException('Comment cannot be empty');
    const entry = await this.prisma.challengeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');
    const comment = await this.prisma.challengeEntryComment.create({
      data: { entryId, authorId: userId, content: content.trim() },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return { ...comment, author: toFlatAuthor(comment.author) };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async adminList() {
    return this.prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async adminCreate(adminId: string | null, data: {
    title: string; description: string; promptText?: string;
    category: string; type: string; startAt: string; endAt: string;
    xpReward?: number; bonusXpReward?: number; coverImageUrl?: string; sponsorLabel?: string;
  }) {
    if (!data.title || !data.description || !data.category || !data.type || !data.startAt || !data.endAt) {
      throw new BadRequestException('Missing required challenge fields');
    }
    return this.prisma.challenge.create({
      data: {
        title: data.title,
        description: data.description,
        promptText: data.promptText,
        category: data.category as any,
        type: data.type as any,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        xpReward: data.xpReward ?? 50,
        bonusXpReward: data.bonusXpReward ?? 100,
        coverImageUrl: data.coverImageUrl,
        sponsorLabel: data.sponsorLabel,
        createdByAdminId: adminId,
      },
    });
  }

  async adminUpdate(challengeId: string, data: Partial<{
    title: string; description: string; promptText: string;
    category: string; type: string; startAt: string; endAt: string;
    xpReward: number; bonusXpReward: number; coverImageUrl: string; sponsorLabel: string;
  }>) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return this.prisma.challenge.update({
      where: { id: challengeId },
      data: {
        ...data,
        category: data.category as any,
        type: data.type as any,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
      },
    });
  }

  async adminPublish(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.status !== 'DRAFT') throw new BadRequestException('Only draft challenges can be published');
    return this.prisma.challenge.update({ where: { id: challengeId }, data: { status: 'ACTIVE' } });
  }

  async adminEnd(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.status === 'ENDED') return challenge;
    return this.finalizeChallenge(challenge.id);
  }

  // ── Rotation cron ─────────────────────────────────────────────────────────
  // Hourly (not just midnight) so Flash Challenges (1-3h windows) transition
  // promptly — same idempotent by-window approach DailyChallenge's midnight
  // cron uses, just finer-grained.
  @Cron(CronExpression.EVERY_HOUR)
  async sweep() {
    const now = new Date();
    await this.prisma.challenge.updateMany({
      where: { status: 'DRAFT', startAt: { lte: now } },
      data: { status: 'ACTIVE' },
    });
    const toEnd = await this.prisma.challenge.findMany({
      where: { status: 'ACTIVE', endAt: { lte: now } },
      select: { id: true },
    });
    for (const c of toEnd) {
      await this.finalizeChallenge(c.id);
    }
  }

  /** Picks a winner (highest average vote, like count as tiebreak) and marks the challenge ENDED. */
  private async finalizeChallenge(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return;

    const entries = await this.prisma.challengeEntry.findMany({
      where: { challengeId, status: 'PUBLISHED' },
      include: { votes: true, likes: true },
    });

    let winner: { userId: string; entryId: string } | null = null;
    let bestScore = -1;
    let bestLikes = -1;
    for (const e of entries) {
      const avg = e.votes.length ? e.votes.reduce((s, v) => s + v.value, 0) / e.votes.length : 0;
      const likeCount = e.likes.length;
      if (avg > bestScore || (avg === bestScore && likeCount > bestLikes)) {
        bestScore = avg;
        bestLikes = likeCount;
        winner = { userId: e.userId, entryId: e.id };
      }
    }

    await this.prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'ENDED', winningEntryId: winner?.entryId ?? null },
    });

    if (winner) {
      await this.prisma.userProfile.update({
        where: { userId: winner.userId },
        data: { xp: { increment: challenge.bonusXpReward } },
      });
      await this.prisma.challengeCategoryStat.upsert({
        where: { userId_category: { userId: winner.userId, category: challenge.category } },
        create: { userId: winner.userId, category: challenge.category, xp: challenge.bonusXpReward, wins: 1 },
        update: { xp: { increment: challenge.bonusXpReward }, wins: { increment: 1 } },
      });
      await this.achievements.evaluateChallengeAchievementsForUser(winner.userId);
    }
  }
}
