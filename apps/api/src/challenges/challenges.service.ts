import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ChallengeGeneratorService } from './challenge-generator.service';
import { NotificationsService } from '../notifications/notifications.service';

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
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    private prisma: PrismaService,
    private achievements: AchievementsService,
    private generator: ChallengeGeneratorService,
    private notifications: NotificationsService,
  ) {}

  // ── Public reads ──────────────────────────────────────────────────────────

  async listActive(category?: string, type?: string, take = 20, skip = 0) {
    return this.prisma.challenge.findMany({
      where: {
        status: 'ACTIVE',
        ...(category ? { category: category as any } : {}),
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { endAt: 'asc' },
      include: { _count: { select: { entries: true } } },
      take,
      skip,
    });
  }

  // Momentum = recent-entry velocity, not just total entries — a challenge
  // that just started picking up steam should outrank an older one that's
  // merely accumulated more entries over a longer window.
  async getTrendingChallenges(take = 10) {
    const active = await this.prisma.challenge.findMany({
      where: { status: 'ACTIVE' },
      include: { _count: { select: { entries: true } } },
    });
    if (!active.length) return [];

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentCounts = await this.prisma.challengeEntry.groupBy({
      by: ['challengeId'],
      where: { challengeId: { in: active.map((c) => c.id) }, createdAt: { gte: since } },
      _count: true,
    });
    const recentByChallenge = new Map(recentCounts.map((r) => [r.challengeId, r._count]));

    return active
      .map((c) => ({
        challenge: c,
        score: (recentByChallenge.get(c.id) ?? 0) * 5 + c._count.entries,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, take)
      .map((s) => s.challenge);
  }

  async getDetail(challengeId: string, viewerId?: string, entriesTake = 30, entriesSkip = 0) {
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
      take: entriesTake,
      skip: entriesSkip,
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
      // Paid (boosted) comments first, then newest free comments
      orderBy: [{ boostAmount: 'desc' }, { createdAt: 'desc' }],
      include: { author: { select: AUTHOR_SELECT } },
    });
    return comments.map((c) => ({ ...c, author: toFlatAuthor(c.author) }));
  }

  async boostComment(
    userId: string,
    commentId: string,
    mshAmount: number,
  ) {
    if (!(mshAmount > 0)) throw new BadRequestException('Boost amount must be positive');

    const comment = await this.prisma.challengeEntryComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('You can only boost your own comments');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    if (Number(wallet.balanceMasheleni) < mshAmount) {
      throw new BadRequestException(`Not enough MSH — balance is ${wallet.balanceMasheleni}`);
    }

    const [, , updatedComment] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balanceMasheleni: { decrement: mshAmount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -mshAmount,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.challengeEntryComment.update({
        where: { id: commentId },
        data: {
          boostAmount: { increment: mshAmount },
          boostedAt: new Date(),
        },
        include: { author: { select: AUTHOR_SELECT } },
      }),
    ]);

    return { ...updatedComment, author: toFlatAuthor(updatedComment.author) };
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

    // Older accounts can predate the automatically-created profile row.
    // An entry must not fail after it has already been saved just because the
    // contributor has no profile yet; create that profile while awarding XP.
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, xp: challenge.xpReward },
      update: { xp: { increment: challenge.xpReward } },
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

  /**
   * Cross-challenge "For You" feed — cursor-paginated, supports search by
   * challenge title / username, and filters by category and scope.
   * Each entry carries a globalRank computed by (likeCount * 2 + voteAverage * 10).
   */
  async getEntriesFeed(
    viewerId: string,
    take = 15,
    cursor?: string,
    search?: string,
    category?: string,
    scope?: string,
  ) {
    const entries = await this.prisma.challengeEntry.findMany({
      where: {
        status: 'PUBLISHED',
        challenge: {
          status: 'ACTIVE',
          ...(category ? { category: category as any } : {}),
          ...(scope ? { scope } : {}),
          ...(search ? { title: { contains: search, mode: 'insensitive' as any } } : {}),
        },
        ...(search ? {
          user: {
            OR: [
              { username: { contains: search, mode: 'insensitive' as any } },
              { profile: { displayName: { contains: search, mode: 'insensitive' as any } } },
            ],
          },
        } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        challenge: {
          select: {
            id: true, title: true, category: true, type: true,
            endAt: true, xpReward: true, scope: true, location: true,
          },
        },
        user: { select: AUTHOR_SELECT },
        likes: { select: { userId: true } },
        votes: { select: { userId: true, value: true } },
        _count: { select: { comments: true } },
      },
    });

    // Total entry count for global rank denominator
    const totalEntries = await this.prisma.challengeEntry.count({
      where: { status: 'PUBLISHED', challenge: { status: 'ACTIVE' } },
    });

    return entries.map((e, idx) => {
      const { user, likes, votes, _count, ...rest } = e;
      const voteAvg = votes.length
        ? votes.reduce((s, v) => s + v.value, 0) / votes.length : 0;
      const score = likes.length * 2 + voteAvg * 10;
      return {
        ...rest,
        user: toFlatAuthor(user),
        likeCount: likes.length,
        isLikedByMe: likes.some((l) => l.userId === viewerId),
        voteCount: votes.length,
        voteAverage: voteAvg,
        myVote: votes.find((v) => v.userId === viewerId)?.value ?? null,
        commentCount: _count.comments,
        score: Math.round(score),
        totalEntries,
      };
    });
  }

  /**
   * Entry stats: global rank, category rank, overall score, leaderboard.
   */
  async getEntryStats(entryId: string) {
    const entry = await this.prisma.challengeEntry.findUnique({
      where: { id: entryId },
      include: {
        challenge: { select: { id: true, title: true, category: true } },
        likes: { select: { userId: true } },
        votes: { select: { value: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!entry) throw new NotFoundException('Entry not found');

    const likeCount = entry.likes.length;
    const voteAvg = entry.votes.length
      ? entry.votes.reduce((s, v) => s + v.value, 0) / entry.votes.length : 0;
    const score = likeCount * 2 + voteAvg * 10;

    // Global rank: count published entries with a higher score
    const allGlobal = await this.prisma.challengeEntry.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        likes: { select: { userId: true } },
        votes: { select: { value: true } },
      },
    });
    const scores = allGlobal.map((e) => {
      const avg = e.votes.length ? e.votes.reduce((s, v) => s + v.value, 0) / e.votes.length : 0;
      return { id: e.id, score: e.likes.length * 2 + avg * 10 };
    });
    scores.sort((a, b) => b.score - a.score);
    const globalRank = scores.findIndex((s) => s.id === entryId) + 1;

    // Category rank
    const sameCat = await this.prisma.challengeEntry.findMany({
      where: { status: 'PUBLISHED', challenge: { category: entry.challenge.category } },
      include: {
        likes: { select: { userId: true } },
        votes: { select: { value: true } },
      },
    });
    const catScores = sameCat.map((e) => {
      const avg = e.votes.length ? e.votes.reduce((s, v) => s + v.value, 0) / e.votes.length : 0;
      return { id: e.id, score: e.likes.length * 2 + avg * 10 };
    });
    catScores.sort((a, b) => b.score - a.score);
    const categoryRank = catScores.findIndex((s) => s.id === entryId) + 1;

    // Top 5 in same challenge
    const challengeTop = await this.prisma.challengeEntry.findMany({
      where: { challengeId: entry.challengeId, status: 'PUBLISHED' },
      include: {
        user: { select: AUTHOR_SELECT },
        likes: { select: { userId: true } },
        votes: { select: { value: true } },
      },
    });
    const challengeRanked = challengeTop
      .map((e) => {
        const avg = e.votes.length ? e.votes.reduce((s, v) => s + v.value, 0) / e.votes.length : 0;
        return { id: e.id, user: toFlatAuthor(e.user), score: Math.round(e.likes.length * 2 + avg * 10), likeCount: e.likes.length, voteAverage: avg };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      entryId,
      challenge: entry.challenge,
      likeCount,
      voteAverage: Math.round(voteAvg * 10) / 10,
      commentCount: entry._count.comments,
      score: Math.round(score),
      globalRank,
      globalTotal: allGlobal.length,
      categoryRank,
      categoryTotal: sameCat.length,
      challengeLeaderboard: challengeRanked,
    };
  }

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

  // AI-generated challenges still land as DRAFT (never auto-published) — same
  // human-curation gate every other challenge goes through, whether written
  // by an admin or proposed by a sponsor. startAt/endAt aren't part of the
  // model's own generated shape (it only proposes content, not scheduling),
  // so a sensible default window is derived from `type` here.
  private static readonly TYPE_WINDOW_MS: Record<string, number> = {
    FLASH: 2 * 60 * 60 * 1000,
    DAILY: 24 * 60 * 60 * 1000,
    WEEKEND: 48 * 60 * 60 * 1000,
    SEASONAL: 14 * 24 * 60 * 60 * 1000,
    SPONSORED: 7 * 24 * 60 * 60 * 1000,
  };

  async generateBatch(adminId: string | null, count = 5, categories?: string[]) {
    const proposals = await this.generator.generate(count, categories as any);
    const created: Awaited<ReturnType<typeof this.prisma.challenge.create>>[] = [];
    for (const p of proposals) {
      const now = new Date();
      const windowMs = ChallengesService.TYPE_WINDOW_MS[p.type] ?? ChallengesService.TYPE_WINDOW_MS.DAILY;
      const challenge = await this.prisma.challenge.create({
        data: {
          title: p.title,
          description: p.description,
          promptText: p.promptText,
          category: p.category,
          type: p.type,
          startAt: now,
          endAt: new Date(now.getTime() + windowMs),
          xpReward: p.xpReward,
          bonusXpReward: p.bonusXpReward,
          createdByAdminId: adminId,
        },
      });
      created.push(challenge);
    }
    if (proposals.length === 0) {
      this.logger.log('AI generation produced no challenges this run (feature off, no API key, or provider error)');
    }
    return created;
  }

  // Fresh DRAFT batch every morning for admin review — matches the spec's
  // "up to 20 active challenges/day" framing without removing the human
  // curation gate. No-ops cleanly (via ChallengeGeneratorService) if AI
  // isn't configured/enabled.
  @Cron('0 6 * * *')
  async generateDailyBatch() {
    await this.generateBatch(null, 5);
  }

  async moderateEntry(entryId: string, status: string) {
    const entry = await this.prisma.challengeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');
    return this.prisma.challengeEntry.update({ where: { id: entryId }, data: { status } });
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
    await this.ensureActiveChallenge();
  }

  // There should always be at least one challenge people can jump into —
  // the 6am daily batch normally covers this (its DRAFT challenges go ACTIVE
  // at the next hourly sweep since startAt is already in the past), but if
  // every active challenge ends before the next batch, or a day's batch came
  // back empty, this closes that gap within an hour instead of leaving the
  // feed empty until 6am tomorrow.
  private async ensureActiveChallenge() {
    const activeCount = await this.prisma.challenge.count({ where: { status: 'ACTIVE' } });
    if (activeCount > 0) return;

    const [proposal] = await this.generator.generate(1);
    const now = new Date();
    const windowMs = ChallengesService.TYPE_WINDOW_MS.DAILY;

    if (!proposal) {
      this.logger.warn('No ACTIVE challenge exists and AI generation returned nothing (feature off, no API key, or provider error) — the challenge feed will be empty until the next admin action or daily batch.');
      return;
    }

    await this.prisma.challenge.create({
      data: {
        title: proposal.title,
        description: proposal.description,
        promptText: proposal.promptText,
        category: proposal.category,
        type: 'DAILY',
        startAt: now,
        endAt: new Date(now.getTime() + windowMs),
        xpReward: proposal.xpReward,
        bonusXpReward: proposal.bonusXpReward,
        status: 'ACTIVE',
      },
    });
    this.logger.log('Auto-activated a fallback challenge to keep at least one challenge running.');
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
      await this.notifications.create(
        winner.userId,
        'challenge.won',
        'You won the challenge!',
        `Your entry won "${challenge.title}"`,
        { challengeId: challenge.id, entryId: winner.entryId },
      );
    }
  }
}
