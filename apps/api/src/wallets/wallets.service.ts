import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';
import { EventBusService } from '../events/event-bus.service';
import { BadgeService } from '../profile/badge.service';

// Content Contribution Remuneration pays out once a month, on the 14th, at
// midnight — this must stay in sync with the @Cron expression on
// payoutCreatorFunds() below, since getNextPayoutDate() is what the mobile
// client displays as "next payout" and it has to describe the same schedule
// the cron enforces. pendingCreatorFunds therefore represents "accumulated
// so far this pay period" (up to a month), not a running-forever balance.
function getNextPayoutDate(from = new Date()): Date {
  const next = new Date(from);
  next.setHours(0, 0, 0, 0);
  if (next.getDate() < 14) {
    next.setDate(14);
  } else {
    next.setMonth(next.getMonth() + 1, 14);
  }
  return next;
}

// ONE WALLET · ONE ECONOMY.
// The Masheleni (MSH) ledger balance is the single source of truth for every
// balance shown and every spend in Guranda — sends, pool wagers, AI transfers,
// purchases. The XRPL address remains the wallet's public identity for future
// on-chain settlement, but balances never come from the chain.

@Injectable()
export class WalletsService {
  constructor(
    private prisma: PrismaService,
    private verificationService: VerificationService,
    private eventBus: EventBusService,
    private badgeService: BadgeService,
  ) {}

  async getMyWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  // Cursor-paginated transaction history for the "All Transactions" screen —
  // getMyWallet only ever returns the latest 20, which isn't enough to page
  // through everything. Same lt-cursor-on-timestamp shape as video.service.ts's
  // getFeed, minus the score-reranking pool trick (this list is plain
  // chronological, so no gap-under-cursor risk).
  async getWalletTransactionsPage(userId: string, cursor?: string, take = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    const pageSize = Math.min(Math.max(take, 1), 50);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId: wallet.id,
        ...(cursor ? { timestamp: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: pageSize,
    });
    const nextCursor =
      transactions.length < pageSize
        ? null
        : transactions[transactions.length - 1].timestamp.toISOString();
    return { transactions, nextCursor };
  }

  // Month-to-date totals for the Activity dashboard, computed over ALL of
  // this month's transactions (not just the latest 20 getMyWallet returns) —
  // "money in" matches the exact set of types the transaction list already
  // renders in green (isPositive in WalletScreen/WalletTransactionsScreen),
  // so the dashboard's total never disagrees with what the list shows.
  async getWalletSummary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTransactions = await this.prisma.transaction.findMany({
      where: { walletId: wallet.id, timestamp: { gte: periodStart } },
      select: { amount: true, type: true },
    });

    // Some types (e.g. VIDEO_REWARD_FUND, a reward-pool reservation) are
    // recorded with a negative amount as a ledger-internal debit convention
    // — a magnitude dashboard should always show "how much moved", so every
    // total and bar here is built from the absolute value, never the raw
    // signed amount.
    const POSITIVE_TYPES = new Set(['RECEIVE', 'DEPOSIT']);
    let moneyIn = 0;
    let moneyOut = 0;
    const byType = new Map<string, number>();
    for (const t of monthTransactions) {
      const amount = Math.abs(Number(t.amount));
      if (POSITIVE_TYPES.has(t.type)) moneyIn += amount;
      else moneyOut += amount;
      byType.set(t.type, (byType.get(t.type) ?? 0) + amount);
    }

    return {
      periodStart: periodStart.toISOString(),
      moneyIn,
      moneyOut,
      byType: Array.from(byType.entries())
        .map(([type, amount]) => ({ type, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  /**
   * Transfer MSH between Guranda users on the ledger.
   * `destination` accepts a Guranda username or a wallet's XRPL address.
   */
  async sendMasheleni(
    senderUserId: string,
    destination: string,
    amount: string,
  ) {
    await this.verificationService.assertVerified(senderUserId, 'Sending MSH');

    const value = parseFloat(amount);
    if (!(value > 0)) {
      throw new BadRequestException('Invalid amount');
    }

    const senderWallet = await this.prisma.wallet.findUnique({
      where: { userId: senderUserId },
    });
    if (!senderWallet) {
      throw new BadRequestException('Sender wallet not found');
    }
    if (Number(senderWallet.balanceMasheleni) < value) {
      throw new BadRequestException(
        `Not enough MSH — balance is ${senderWallet.balanceMasheleni}`,
      );
    }

    // Resolve the recipient: xrpl address first, then username
    let recipientWallet = await this.prisma.wallet.findFirst({
      where: { xrplAddress: destination },
    });
    if (!recipientWallet) {
      const byUsername = await this.prisma.user.findUnique({
        where: { username: destination.replace(/^@/, '') },
        include: { wallet: true },
      });
      recipientWallet = byUsername?.wallet ?? null;
    }
    if (!recipientWallet) {
      throw new BadRequestException(
        'Recipient not found — use a Guranda username or wallet address',
      );
    }
    if (recipientWallet.id === senderWallet.id) {
      throw new BadRequestException('You cannot send MSH to yourself');
    }

    const [, , transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balanceMasheleni: { decrement: value } },
      }),
      this.prisma.wallet.update({
        where: { id: recipientWallet.id },
        data: { balanceMasheleni: { increment: value } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: -value,
          type: 'SEND',
          status: 'SUCCESS',
        },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: recipientWallet.id,
          amount: value,
          type: 'RECEIVE',
          status: 'SUCCESS',
        },
      }),
      this.prisma.event.create(
        this.eventBus.write('wallet.transfer.completed', senderWallet.id, {
          senderWalletId: senderWallet.id,
          recipientWalletId: recipientWallet.id,
          amount: value,
        }),
      ),
    ]);

    return { success: true, transaction };
  }

  /**
   * Available balance for holds is a COMPUTED value (balance minus the sum
   * of this wallet's active holds), not a stored field — deliberately, so
   * every existing call site that reads `wallet.balanceMasheleni` directly
   * keeps working unchanged; only hold-aware flows need to think in terms
   * of "available" vs "total".
   */
  async availableBalance(walletId: string): Promise<number> {
    const [wallet, activeHolds] = await Promise.all([
      this.prisma.wallet.findUniqueOrThrow({ where: { id: walletId } }),
      this.prisma.walletHold.aggregate({
        where: { walletId, status: 'HELD' },
        _sum: { amount: true },
      }),
    ]);
    return Number(wallet.balanceMasheleni) - (activeHolds._sum.amount ?? 0);
  }

  /**
   * Escrow primitive (§10/§25 of the platform evolution plan): reserves
   * `amount` without touching balanceMasheleni yet. No live flow calls this
   * today — no booking/purchase flow needs a multi-step approve-then-spend
   * yet — this is the seed for the AI-planned-purchase flow described in
   * the plan's §7, tested directly rather than wired into an existing path.
   */
  async holdFunds(walletId: string, amount: number, reason: string, ttlMinutes = 15) {
    if (!(amount > 0)) throw new BadRequestException('Invalid hold amount');
    const available = await this.availableBalance(walletId);
    if (available < amount) {
      throw new BadRequestException(`Not enough available balance — ${available} MSH free`);
    }
    return this.prisma.walletHold.create({
      data: {
        walletId,
        amount,
        reason,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });
  }

  /** Converts a HELD row into a real atomic debit — the actual spend. */
  async captureHold(holdId: string) {
    const hold = await this.prisma.walletHold.findUniqueOrThrow({ where: { id: holdId } });
    if (hold.status !== 'HELD') {
      throw new BadRequestException(`Hold is ${hold.status}, not HELD`);
    }
    const [, , , updatedHold] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: hold.walletId },
        data: { balanceMasheleni: { decrement: hold.amount } },
      }),
      this.prisma.transaction.create({
        data: { walletId: hold.walletId, amount: -hold.amount, type: 'PAYMENT', status: 'SUCCESS' },
      }),
      this.prisma.event.create(
        this.eventBus.write('wallet.hold.captured', hold.walletId, { holdId, amount: hold.amount, reason: hold.reason }),
      ),
      this.prisma.walletHold.update({
        where: { id: holdId },
        data: { status: 'CAPTURED', resolvedAt: new Date() },
      }),
    ]);
    return updatedHold;
  }

  /** Releases a hold back to spendable balance — nothing to reverse, since holding never touched balanceMasheleni. */
  async releaseHold(holdId: string) {
    const hold = await this.prisma.walletHold.findUniqueOrThrow({ where: { id: holdId } });
    if (hold.status !== 'HELD') {
      throw new BadRequestException(`Hold is ${hold.status}, not HELD`);
    }
    return this.prisma.walletHold.update({
      where: { id: holdId },
      data: { status: 'RELEASED', resolvedAt: new Date() },
    });
  }

  /**
   * Start a deposit: real-world money (currently PayShap only) coming onto the
   * MSH ledger. No live PSP is wired in yet, so this returns payment
   * instructions against a fixed reference and leaves the request PENDING —
   * an admin confirms it once the money actually lands (or, later, a PSP
   * webhook can call confirmDeposit() directly instead of a human).
   */
  async requestDeposit(userId: string, amountZar: string) {
    const value = parseFloat(amountZar);
    if (!(value > 0)) {
      throw new BadRequestException('Invalid amount');
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const reference = `GRD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const deposit = await this.prisma.depositRequest.create({
      data: {
        userId,
        walletId: wallet.id,
        reference,
        method: 'PAYSHAP',
        amountZar: value,
      },
    });

    return {
      ...deposit,
      payShapId: '0860 000 000',
      instructions: `Send R${value.toFixed(2)} via PayShap to 0860 000 000 using reference ${reference}. Your MSH balance updates once it's confirmed.`,
    };
  }

  async listMyDeposits(userId: string) {
    return this.prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPendingDeposits() {
    return this.prisma.depositRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { username: true } } },
    });
  }

  async confirmDeposit(depositId: string, adminNote?: string) {
    const deposit = await this.prisma.depositRequest.findUnique({
      where: { id: depositId },
    });
    if (!deposit) {
      throw new NotFoundException('Deposit request not found');
    }
    if (deposit.status !== 'PENDING') {
      throw new BadRequestException(`Deposit is already ${deposit.status}`);
    }

    const [, , updated] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: deposit.walletId },
        data: { balanceMasheleni: { increment: deposit.amountZar } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: deposit.walletId,
          amount: deposit.amountZar,
          type: 'DEPOSIT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.depositRequest.update({
        where: { id: depositId },
        data: { status: 'PAID', confirmedAt: new Date(), adminNote },
      }),
    ]);

    return updated;
  }

  async rejectDeposit(depositId: string, adminNote?: string) {
    const deposit = await this.prisma.depositRequest.findUnique({
      where: { id: depositId },
    });
    if (!deposit) {
      throw new NotFoundException('Deposit request not found');
    }
    if (deposit.status !== 'PENDING') {
      throw new BadRequestException(`Deposit is already ${deposit.status}`);
    }
    return this.prisma.depositRequest.update({
      where: { id: depositId },
      data: { status: 'REJECTED', confirmedAt: new Date(), adminNote },
    });
  }

  async getCreatorFundsSummary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return {
      // Accrued since the last payout — with a monthly cadence this is
      // effectively "how much you've earned this pay period so far".
      accumulatedThisMonth: wallet.pendingCreatorFunds,
      pendingBalance: wallet.pendingCreatorFunds,
      nextPayoutDate: getNextPayoutDate().toISOString(),
    };
  }

  // Batches every user's accrued Content Contribution Remuneration
  // (from story likes/comments/ranks — see StoryService) into their
  // spendable balance in one lump sum, matching getNextPayoutDate() above.
  @Cron('0 0 14 * *')
  async payoutCreatorFunds() {
    const wallets = await this.prisma.wallet.findMany({
      where: { pendingCreatorFunds: { gt: 0 } },
    });
    for (const wallet of wallets) {
      // Best-effort — an uncapped mint should never block a real payout.
      this.badgeService.mintUncapped(wallet.userId, 'CCR_CREATOR').catch(() => {});
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceMasheleni: { increment: wallet.pendingCreatorFunds },
            pendingCreatorFunds: 0,
          },
        }),
        this.prisma.transaction.updateMany({
          where: {
            walletId: wallet.id,
            status: 'PENDING',
            type: { in: ['STORY_LIKE', 'STORY_COMMENT', 'STORY_RANK'] },
          },
          data: { status: 'SUCCESS' },
        }),
      ]);
    }
    return { walletsPaid: wallets.length };
  }
}
