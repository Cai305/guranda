import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';

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
    ]);

    return { success: true, transaction };
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
}
