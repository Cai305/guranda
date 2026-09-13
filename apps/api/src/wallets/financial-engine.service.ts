import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WalletsService } from './wallets.service';
import { EventBusService } from '../events/event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';

// Mirrors PAYMENT_REQUEST_CARD_TAG in
// apps/mobile/src/components/cards/PaymentRequestMiniCard.tsx — the API
// only ever WRITES this shape, the mobile client decodes/renders it (same
// split as MONEY_CARD_TAG in wallets.service.ts).
const PAYMENT_REQUEST_CARD_TAG = '__paymentRequestCard';

/**
 * Phase 2 (Financial Engine) per docs/18 §25 and docs/19 §7: "wrap, don't
 * replace" — every method here is either a thin passthrough to the existing
 * WalletsService (send/hold/capture/release/deposit stay exactly as they
 * behave today, this just gives every future caller — AI tools, mini apps,
 * widgets — one place to call instead of reaching into WalletsService
 * directly) or a genuinely new primitive that didn't exist before
 * (requestPayment/respondToPaymentRequest/purchase).
 *
 * Rail strategy (product decision, 2026-08-13): Rand stays a pure internal
 * ledger — no XRPL settlement here. withdraw() is deliberately NOT built
 * yet; it would need the same manual/admin-reviewed shape as deposit
 * (requestDeposit → admin confirmDeposit/rejectDeposit) once there's a real
 * rail to pay out to, and building that shape without a real payout target
 * would just be an unused stub.
 */
@Injectable()
export class FinancialEngineService {
  constructor(
    private prisma: PrismaService,
    private wallets: WalletsService,
    private eventBus: EventBusService,
    private notifications: NotificationsService,
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  getBalance(userId: string) {
    return this.wallets.getMyWallet(userId);
  }

  send(userId: string, destination: string, amount: string) {
    return this.wallets.sendMasheleni(userId, destination, amount);
  }

  hold(walletId: string, amount: number, reason: string, ttlMinutes?: number) {
    return this.wallets.holdFunds(walletId, amount, reason, ttlMinutes);
  }

  capture(holdId: string) {
    return this.wallets.captureHold(holdId);
  }

  release(holdId: string) {
    return this.wallets.releaseHold(holdId);
  }

  deposit(userId: string, amountZar: string) {
    return this.wallets.requestDeposit(userId, amountZar);
  }

  /**
   * One-sided "AI/mini-app wants to spend N Rand, no peer recipient"
   * primitive — reserves via holdFunds (which checks availableBalance,
   * i.e. accounts for any other concurrent holds) then immediately
   * captures. A convenience wrapper for future purchase-shaped AI tools;
   * gives a real WalletHold audit row (reason + CAPTURED status) instead
   * of just a bare Transaction row.
   */
  async purchase(userId: string, amount: number, reason: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    const hold = await this.wallets.holdFunds(wallet.id, amount, reason);
    return this.wallets.captureHold(hold.id);
  }

  /**
   * Ask another user to pay you — the real feature behind WalletScreen's
   * previously-disabled "Request" button. Never touches balanceMasheleni
   * itself; accepting one just triggers a normal sendMasheleni transfer
   * (respondToPaymentRequest below), same ledger path as any other send.
   */
  async requestPayment(requesterId: string, payerDestination: string, amount: string, memo?: string) {
    const value = parseFloat(amount);
    if (!(value > 0)) {
      throw new BadRequestException('Invalid amount');
    }

    // Username first, then a raw user id — same "chat only has a userId
    // handy" reasoning as sendMasheleni's destination resolution.
    const payer = (await this.prisma.user.findUnique({
      where: { username: payerDestination.replace(/^@/, '') },
      select: { id: true, username: true, profile: { select: { displayName: true } } },
    })) ?? (await this.prisma.user.findUnique({
      where: { id: payerDestination },
      select: { id: true, username: true, profile: { select: { displayName: true } } },
    }));
    if (!payer) {
      throw new NotFoundException('User not found — use a Guranda username');
    }
    if (payer.id === requesterId) {
      throw new BadRequestException('You cannot request Rand from yourself');
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { username: true, profile: { select: { displayName: true } } },
    });
    const requesterName = requester?.profile?.displayName || requester?.username || 'Someone';

    const [request] = await this.prisma.$transaction([
      this.prisma.paymentRequest.create({
        data: { requesterId, payerId: payer.id, amount: value, memo },
      }),
      this.prisma.event.create(
        this.eventBus.write('payment.requested', requesterId, {
          payerId: payer.id,
          amount: value,
        }),
      ),
    ]);

    await this.notifications.create(
      payer.id,
      'payment.request',
      `${requesterName} requested R${value}`,
      memo ? `"${memo}"` : `Requested R${value} from you.`,
      { paymentRequestId: request.id, amount: value, requesterId },
    );

    // Inline "X is requesting Ry from you" card in their chat, mirroring
    // sendMasheleni's notifyTransfer — best-effort, never lets a chat/DM
    // hiccup (e.g. a block between the two) undo the request that already
    // committed above.
    this.postRequestCard(request.id, requesterId, requesterName, payer.id, value, memo).catch((e) =>
      console.error('payment request chat-card failed:', e?.message),
    );

    return request;
  }

  private async postRequestCard(
    paymentRequestId: string,
    requesterId: string,
    requesterName: string,
    payerId: string,
    amount: number,
    memo: string | undefined,
  ): Promise<void> {
    const chat = await this.chatService.createDirectChat(requesterId, payerId);
    this.chatGateway.joinUserSockets(requesterId, chat.id);
    this.chatGateway.joinUserSockets(payerId, chat.id);

    const content = JSON.stringify({
      [PAYMENT_REQUEST_CARD_TAG]: true,
      paymentRequestId,
      amount,
      memo: memo ?? null,
      requesterId,
      requesterName,
      payerId,
      requestedAt: new Date().toISOString(),
    });
    const savedMessage = await this.chatService.sendMessage(requesterId, chat.id, content);
    this.chatGateway.broadcastNewMessage(chat.id, savedMessage);
  }

  /** Single-request lookup for the chat card — only the requester or payer may read it. */
  async getPaymentRequest(id: string, userId: string) {
    const request = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Payment request not found');
    if (request.requesterId !== userId && request.payerId !== userId) {
      throw new ForbiddenException('Not your payment request');
    }
    return request;
  }

  async listPaymentRequests(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.paymentRequest.findMany({
        where: { payerId: userId, status: 'PENDING' },
        include: { requester: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentRequest.findMany({
        where: { requesterId: userId },
        include: { payer: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return { incoming, outgoing };
  }

  async respondToPaymentRequest(requestId: string, responderId: string, accept: boolean) {
    const request = await this.prisma.paymentRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Payment request not found');
    if (request.payerId !== responderId) {
      throw new ForbiddenException('This request is not addressed to you');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    if (!accept) {
      const declined = await this.prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'DECLINED', respondedAt: new Date() },
      });
      await this.prisma.event.create(
        this.eventBus.write('payment.request.declined', request.requesterId, { requestId }),
      ).catch(() => {});
      return declined;
    }

    // Accepting just triggers the normal transfer — same ledger path,
    // same balance checks, same event, as any other Rand send call.
    const requesterUser = await this.prisma.user.findUnique({ where: { id: request.requesterId }, select: { username: true } });
    if (!requesterUser) throw new NotFoundException('Requester no longer exists');

    await this.wallets.sendMasheleni(responderId, requesterUser.username, String(request.amount));

    const paid = await this.prisma.paymentRequest.update({
      where: { id: requestId },
      data: { status: 'PAID', respondedAt: new Date() },
    });
    await this.prisma.event.create(
      this.eventBus.write('payment.request.paid', request.requesterId, { requestId, amount: request.amount }),
    ).catch(() => {});

    await this.notifications.create(
      request.requesterId,
      'payment.request.paid',
      'Payment request paid',
      `Your request for R${request.amount} was paid.`,
      { paymentRequestId: request.id, amount: request.amount },
    );

    return paid;
  }
}
