import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
// passwordHash/encryptedSeed used to be stripped manually here (this module
// is where the original leak was found) — that's now handled once, globally,
// by StripSensitiveInterceptor (see common/strip-sensitive.interceptor.ts,
// registered in app.module.ts) for every REST response, this one included.

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeChess,
      activeLudo,
      completedLudo,
      pendingRides,
      activeRides,
      completedRides,
      cancelledRides,
      liveRooms,
      totalMSH,
      totalTransactions,
      recentUsers,
      allUsers,
      allLudoGames,
      allChessGames,
      allRides,
      topWallets,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.chessGame.count({ where: { status: 'active' } }),
      this.prisma.ludoGame.count({ where: { status: 'active' } }),
      this.prisma.ludoGame.count({ where: { status: 'finished' } }),
      this.prisma.ride.count({ where: { status: 'REQUESTED' } }),
      this.prisma.ride.count({
        where: { status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      }),
      this.prisma.ride.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ride.count({ where: { status: 'CANCELLED' } }),
      this.prisma.liveRoom.count({ where: { isLive: true } }),
      this.prisma.wallet.aggregate({ _sum: { balanceMasheleni: true } }),
      this.prisma.transaction.count(),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
      // For time-series: all users (createdAt)
      this.prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      // Ludo games for time-series
      this.prisma.ludoGame.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, mode: true, status: true },
      }),
      // Chess games
      this.prisma.chessGame.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true },
      }),
      // All rides for status breakdown
      this.prisma.ride.findMany({
        select: { status: true, createdAt: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // Top wallets
      this.prisma.wallet.findMany({
        include: { user: { include: { profile: true } } },
        orderBy: { balanceMasheleni: 'desc' },
        take: 10,
      }),
    ]);

    // Build daily buckets for the last 30 days
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });

    const bucket = (items: { createdAt: Date }[]) => {
      const map: Record<string, number> = {};
      items.forEach((item) => {
        const key = item.createdAt.toISOString().slice(0, 10);
        map[key] = (map[key] ?? 0) + 1;
      });
      return days.map((day) => ({ day: day.slice(5), value: map[day] ?? 0 }));
    };

    // Cumulative growth (running total, not just daily deltas) — the shape
    // investors actually want to see, vs. the daily-signups bar chart above.
    const dailyNew = bucket(allUsers);
    const baselineUsers = totalUsers - allUsers.length;
    let running = baselineUsers;
    const cumulativeUserGrowth = dailyNew.map((d) => {
      running += d.value;
      return { day: d.day, value: running };
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const newUsersThisWeek = allUsers.filter(
      (u) => u.createdAt >= sevenDaysAgo,
    ).length;
    const newUsersLastWeek = allUsers.filter(
      (u) => u.createdAt >= fourteenDaysAgo && u.createdAt < sevenDaysAgo,
    ).length;
    const weekOverWeekPct =
      newUsersLastWeek > 0
        ? ((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100
        : newUsersThisWeek > 0
          ? 100
          : 0;

    // Ludo mode distribution
    const ludoModes: Record<string, number> = {};
    allLudoGames.forEach((g) => {
      ludoModes[g.mode] = (ludoModes[g.mode] ?? 0) + 1;
    });

    // Ride status breakdown
    const rideStatus = [
      { name: 'Pending', value: pendingRides, color: '#f59e0b' },
      { name: 'In Progress', value: activeRides, color: '#3b82f6' },
      { name: 'Completed', value: completedRides, color: '#22c55e' },
      { name: 'Cancelled', value: cancelledRides, color: '#ef4444' },
    ];

    // Game type breakdown
    const gameTypes = [
      { name: 'Ludo (active)', value: activeLudo, color: '#8b5cf6' },
      { name: 'Ludo (done)', value: completedLudo, color: '#a78bfa' },
      { name: 'Chess (active)', value: activeChess, color: '#06b6d4' },
    ];

    return {
      totalUsers,
      activeGames: activeChess + activeLudo,
      activeChess,
      activeLudo,
      pendingRides,
      activeRides,
      liveRooms,
      // totalOotd superseded by getStoryMetrics()'s totalLabeledStories
      totalMSH: totalMSH._sum.balanceMasheleni ?? 0,
      totalTransactions,
      recentUsers,
      newUsersThisWeek,
      newUsersLastWeek,
      weekOverWeekPct,
      // Charts data
      userGrowth: bucket(allUsers),
      cumulativeUserGrowth,
      gameActivity: bucket([...allLudoGames, ...allChessGames]),
      rideActivity: bucket(allRides),
      rideStatus,
      gameTypes,
      ludoModes: Object.entries(ludoModes).map(([name, value]) => ({
        name,
        value,
      })),
      topWallets: topWallets.map((w) => ({
        name: w.user?.profile?.displayName || w.user?.username || 'Unknown',
        msh: Number(w.balanceMasheleni),
      })),
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        profile: true,
        wallet: true,
        _count: {
          select: {
            stories: true,
            posts: true,
            sentMessages: true,
            ludoGames: true,
            whiteGames: true,
            blackGames: true,
            ridesAsRider: true,
            ridesAsDriver: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        wallet: {
          include: {
            transactions: { take: 20, orderBy: { timestamp: 'desc' } },
          },
        },
        stories: {
          include: { likes: true, comments: true, ranks: true, items: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        posts: {
          include: { likes: true, comments: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        ludoGames: { take: 10, orderBy: { createdAt: 'desc' } },
        whiteGames: {
          take: 5,
          include: { blackPlayer: { include: { profile: true } } },
        },
        blackGames: {
          take: 5,
          include: { whitePlayer: { include: { profile: true } } },
        },
        ridesAsRider: { take: 10, orderBy: { createdAt: 'desc' } },
        ridesAsDriver: { take: 10, orderBy: { createdAt: 'desc' } },
        driverProfile: true,
        liveRooms: { take: 5, orderBy: { startedAt: 'desc' } },
      },
    });
    return user;
  }

  async getActiveGames() {
    const [chess, ludo, cards] = await Promise.all([
      this.prisma.chessGame.findMany({
        where: { status: 'active' },
        include: {
          whitePlayer: { include: { profile: true } },
          blackPlayer: { include: { profile: true } },
        },
        orderBy: { lastMoveAt: 'desc' },
      }),
      this.prisma.ludoGame.findMany({
        where: { status: 'active' },
        include: { createdBy: { include: { profile: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.cardGame.findMany({
        where: { status: 'active' },
        include: { createdBy: { include: { profile: true } }, room: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return { chess, ludo, cards };
  }

  // ---- Cards platform: moderation, tournaments, analytics ----

  async getCardReports(status: string = 'open') {
    return this.prisma.playerReport.findMany({
      where: { status },
      include: {
        reporter: { select: { id: true, username: true, profile: true } },
        reportedUser: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveCardReport(id: string, status: 'reviewed' | 'actioned' | 'dismissed', reviewedById: string) {
    return this.prisma.playerReport.update({ where: { id }, data: { status, reviewedById } });
  }

  async getCardTournaments() {
    return this.prisma.cardTournament.findMany({
      include: { entries: true, rounds: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getCardsAnalytics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalGames,
      activeGames,
      finishedGames,
      gamesLast30Days,
      wagerVolume,
      activeRooms,
      openTournaments,
      openReports,
      fiveCardsStatsCount,
      cassinoStatsCount,
    ] = await Promise.all([
      this.prisma.cardGame.count(),
      this.prisma.cardGame.count({ where: { status: 'active' } }),
      this.prisma.cardGame.count({ where: { status: 'finished' } }),
      this.prisma.cardGame.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.cardGame.aggregate({ _sum: { wager: true }, where: { wager: { gt: 0 } } }),
      this.prisma.cardRoom.count({ where: { status: 'waiting' } }),
      this.prisma.cardTournament.count({ where: { status: { in: ['registration', 'active'] } } }),
      this.prisma.playerReport.count({ where: { status: 'open' } }),
      this.prisma.cardGameStats.count({ where: { mode: 'FIVE_CARDS' } }),
      this.prisma.cardGameStats.count({ where: { mode: 'CASSINO' } }),
    ]);

    return {
      totalGames,
      activeGames,
      finishedGames,
      gamesLast30Days,
      totalWagerVolume: wagerVolume._sum.wager ?? 0,
      activeRooms,
      openTournaments,
      openReports,
      distinctPlayers: { fiveCards: fiveCardsStatsCount, cassino: cassinoStatsCount },
    };
  }

  async getRides() {
    const rides = await this.prisma.ride.findMany({
      include: {
        rider: { include: { profile: true } },
        driver: { include: { profile: true, driverProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rides;
  }

  async getLiveRooms() {
    const rooms = await this.prisma.liveRoom.findMany({
      include: { host: { include: { profile: true } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    return rooms;
  }

  /**
   * "of the Day" labeled stories — the generalized OOTD/COTD/etc. feed.
   * Trending-label counts here mirror StoryService.getTrendingLabels()'s
   * shape but over a 30-day admin window rather than the 7-day feed default.
   */
  async getStoryMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalLabeledStories, recentLabeled, labeledInRange] =
      await Promise.all([
        this.prisma.story.count({ where: { label: { not: null } } }),
        this.prisma.story.findMany({
          where: { label: { not: null } },
          include: {
            user: { include: { profile: true } },
            likes: true,
            comments: true,
            ranks: true,
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        this.prisma.story.findMany({
          where: { label: { not: null }, createdAt: { gte: thirtyDaysAgo } },
          select: { label: true, createdAt: true },
        }),
      ]);

    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });
    const bucket = (items: { createdAt: Date }[]) => {
      const map: Record<string, number> = {};
      items.forEach((item) => {
        const key = item.createdAt.toISOString().slice(0, 10);
        map[key] = (map[key] ?? 0) + 1;
      });
      return days.map((day) => ({ day: day.slice(5), value: map[day] ?? 0 }));
    };

    const labelCounts: Record<string, number> = {};
    labeledInRange.forEach((s) => {
      labelCounts[s.label!] = (labelCounts[s.label!] ?? 0) + 1;
    });
    const trendingLabels = Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

    return {
      totalLabeledStories,
      trendingLabels,
      labeledStoriesGrowth: bucket(labeledInRange),
      recentLabeled: recentLabeled.map((s) => ({
        id: s.id,
        label: s.label,
        author: s.user?.profile?.displayName || s.user?.username,
        likes: s.likes.length,
        comments: s.comments.length,
        avgRank: s.ranks.length
          ? s.ranks.reduce((sum, r) => sum + r.value, 0) / s.ranks.length
          : null,
        itemsForSale: s.items.filter((i) => i.isForSale).length,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    };
  }

  async getEconomy() {
    const [wallets, transactions, aggregate] = await Promise.all([
      this.prisma.wallet.findMany({
        include: { user: { include: { profile: true } } },
        orderBy: { balanceMasheleni: 'desc' },
        take: 100,
      }),
      this.prisma.transaction.findMany({
        include: {
          wallet: { include: { user: { include: { profile: true } } } },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
      this.prisma.wallet.aggregate({
        _sum: { balanceMasheleni: true },
        _avg: { balanceMasheleni: true },
        _count: true,
      }),
    ]);
    return {
      wallets,
      transactions,
      totalMSH: aggregate._sum.balanceMasheleni ?? 0,
      avgMSH: aggregate._avg.balanceMasheleni ?? 0,
      walletCount: aggregate._count,
    };
  }

  /**
   * AI usage is tracked separately from general platform activity: ToolExecutionLog
   * rows only exist for actions the AI companion actually executed on a user's
   * behalf, so this whole method is "what did the AI do" — distinct from getStats(),
   * which is "what are users doing directly."
   */
  async getAiUsage() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalAgents,
      onboardedAgents,
      totalExecutions,
      successCount,
      failedCount,
      pendingCount,
      recentExecutions,
      executionsInRange,
      distinctUsers,
      avgDuration,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.aiAgent.count(),
      this.prisma.aiAgent.count({ where: { onboarded: true } }),
      this.prisma.toolExecutionLog.count(),
      this.prisma.toolExecutionLog.count({ where: { status: 'SUCCESS' } }),
      this.prisma.toolExecutionLog.count({ where: { status: 'FAILED' } }),
      this.prisma.toolExecutionLog.count({ where: { status: 'PENDING' } }),
      this.prisma.toolExecutionLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: { profile: true } } },
      }),
      this.prisma.toolExecutionLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, toolName: true },
      }),
      this.prisma.toolExecutionLog.groupBy({ by: ['userId'] }),
      this.prisma.toolExecutionLog.aggregate({
        _avg: { durationMs: true },
        where: { durationMs: { not: null } },
      }),
    ]);

    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });
    const bucket = (items: { createdAt: Date }[]) => {
      const map: Record<string, number> = {};
      items.forEach((item) => {
        const key = item.createdAt.toISOString().slice(0, 10);
        map[key] = (map[key] ?? 0) + 1;
      });
      return days.map((day) => ({ day: day.slice(5), value: map[day] ?? 0 }));
    };

    const moduleCounts: Record<string, number> = {};
    const toolCounts: Record<string, number> = {};
    executionsInRange.forEach((e) => {
      const mod = e.toolName.split('.')[0];
      moduleCounts[mod] = (moduleCounts[mod] ?? 0) + 1;
      toolCounts[e.toolName] = (toolCounts[e.toolName] ?? 0) + 1;
    });

    const uniqueAiUsers = distinctUsers.length;

    return {
      totalUsers,
      totalAgents,
      onboardedAgents,
      aiAdoptionPct: totalUsers > 0 ? (onboardedAgents / totalUsers) * 100 : 0,
      totalExecutions,
      successCount,
      failedCount,
      pendingCount,
      uniqueAiUsers,
      avgExecutionsPerActiveUser:
        uniqueAiUsers > 0 ? totalExecutions / uniqueAiUsers : 0,
      avgDurationMs: avgDuration._avg.durationMs ?? 0,
      executionsGrowth: bucket(executionsInRange),
      topModules: Object.entries(moduleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value })),
      topTools: Object.entries(toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value })),
      statusBreakdown: [
        { name: 'Success', value: successCount, color: '#22c55e' },
        { name: 'Failed', value: failedCount, color: '#ef4444' },
        { name: 'Pending', value: pendingCount, color: '#f59e0b' },
      ],
      recentExecutions: recentExecutions.map((e) => ({
        id: e.id,
        toolName: e.toolName,
        status: e.status,
        durationMs: e.durationMs,
        createdAt: e.createdAt,
        username: e.user?.username,
        displayName: e.user?.profile?.displayName,
      })),
    };
  }

  // Was overwriting passwordHash with a sentinel string — worked (bcrypt
  // never matches it, so login always failed) but permanently destroyed the
  // user's real password with no way back, and stored a non-hash literal in
  // a hash column. `isSuspended` is a real flag now, checked at login
  // (users.service.ts) and on every request (jwt.strategy.ts) so a
  // suspension takes effect immediately, not just on the next login.
  async suspendUser(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { isSuspended: true },
    });
    return { success: true };
  }

  async unsuspendUser(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { isSuspended: false },
    });
    return { success: true };
  }
}
