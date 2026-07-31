import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { XrplService } from './xrpl.service';

const MEMBER_SELECT = {
  include: { user: { select: { id: true, username: true, profile: true } } },
};

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private xrpl: XrplService,
  ) {}

  private async log(
    stokvelId: string,
    actorId: string | null,
    action: string,
    detail?: string,
  ) {
    await this.prisma.stokvelAuditLog.create({
      data: { stokvelId, actorId, action, detail },
    });
  }

  private async requireMembership(stokvelId: string, userId: string) {
    const member = await this.prisma.stokvelMember.findUnique({
      where: { stokvelId_userId: { stokvelId, userId } },
    });
    if (!member || member.status !== 'ACTIVE')
      throw new ForbiddenException('You are not a member of this stokvel');
    return member;
  }

  private async personalWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet?.xrplAddress || !wallet.encryptedSeed) {
      throw new BadRequestException(
        'Your Guranda wallet has no XRPL identity yet',
      );
    }
    return wallet;
  }

  // ── Stokvels ──────────────────────────────────────────────────────────────

  async createStokvel(userId: string, dto: any) {
    if (!dto.name?.trim() || !dto.category?.trim())
      throw new BadRequestException('Name and category are required');
    if (!dto.contributionAmount || dto.contributionAmount <= 0)
      throw new BadRequestException('Contribution amount is required');

    const { address, encodedSeed } = await this.xrpl.createFundedWallet();

    const stokvel = await this.prisma.stokvel.create({
      data: {
        name: dto.name.trim(),
        category: dto.category.trim(),
        description: dto.description || null,
        creatorId: userId,
        contributionAmount: dto.contributionAmount,
        contributionFrequency: dto.contributionFrequency || 'MONTHLY',
        joiningFee: dto.joiningFee || 0,
        votingThresholdPct: dto.votingThresholdPct || 80,
        minMembers: dto.minMembers || 3,
        signerQuorum: dto.signerQuorum || 2,
        withdrawalRules: dto.withdrawalRules || null,
        loanRules: dto.loanRules || null,
        fundingRules: dto.fundingRules || null,
        latePenaltyPct: dto.latePenaltyPct || 0,
        approvalWorkflow: dto.approvalWorkflow || null,
        xrplAddress: address,
        xrplSeed: encodedSeed,
      },
    });

    await this.prisma.stokvelMember.create({
      data: { stokvelId: stokvel.id, userId, role: 'ADMIN' },
    });

    await this.log(
      stokvel.id,
      userId,
      'CREATED',
      `Stokvel "${stokvel.name}" created, XRPL wallet ${address}`,
    );
    return stokvel;
  }

  async listStokvels(category?: string) {
    return this.prisma.stokvel.findMany({
      where: { status: 'ACTIVE', ...(category ? { category } : {}) },
      include: {
        creator: { select: { id: true, username: true, profile: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myStokvels(userId: string) {
    const memberships = await this.prisma.stokvelMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        stokvel: { include: { _count: { select: { members: true } } } },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.stokvel, myRole: m.role }));
  }

  async getStokvel(id: string, userId: string) {
    const stokvel = await this.prisma.stokvel.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, profile: true } },
        members: {
          ...MEMBER_SELECT,
          where: { status: 'ACTIVE' },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!stokvel) throw new NotFoundException('Stokvel not found');

    const membership = stokvel.members.find((m) => m.userId === userId);
    const balanceXrp = stokvel.xrplAddress
      ? await this.xrpl.getBalance(stokvel.xrplAddress)
      : 0;

    return {
      ...stokvel,
      balanceXrp,
      myRole: membership?.role || null,
      committeeCount: stokvel.members.filter(
        (m) => m.role === 'COMMITTEE' || m.role === 'ADMIN',
      ).length,
    };
  }

  async joinStokvel(stokvelId: string, userId: string) {
    const stokvel = await this.prisma.stokvel.findUnique({
      where: { id: stokvelId },
    });
    if (!stokvel) throw new NotFoundException('Stokvel not found');
    const existing = await this.prisma.stokvelMember.findUnique({
      where: { stokvelId_userId: { stokvelId, userId } },
    });
    if (existing) throw new BadRequestException('You are already a member');

    const member = await this.prisma.stokvelMember.create({
      data: { stokvelId, userId, role: 'MEMBER' },
      ...MEMBER_SELECT,
    });
    await this.log(
      stokvelId,
      userId,
      'MEMBER_JOINED',
      `${member.user.username} joined`,
    );
    return member;
  }

  async promoteMember(stokvelId: string, actorId: string, memberId: string) {
    const actor = await this.requireMembership(stokvelId, actorId);
    if (actor.role !== 'ADMIN')
      throw new ForbiddenException(
        'Only the stokvel admin can promote members',
      );

    const member = await this.prisma.stokvelMember.findUnique({
      where: { id: memberId },
      ...MEMBER_SELECT,
    });
    if (!member || member.stokvelId !== stokvelId)
      throw new NotFoundException('Member not found');
    if (member.role !== 'MEMBER')
      throw new BadRequestException('Member is already on the committee');

    // Committee signing authority is the member's own personal XRPL identity —
    // ensure it actually exists on-chain before it can ever be used as a signer.
    const wallet = await this.personalWallet(member.userId);
    await this.xrpl.ensureFunded(wallet.encryptedSeed!);

    const updated = await this.prisma.stokvelMember.update({
      where: { id: memberId },
      data: { role: 'COMMITTEE' },
      ...MEMBER_SELECT,
    });
    await this.log(
      stokvelId,
      actorId,
      'MEMBER_PROMOTED',
      `${updated.user.username} promoted to committee`,
    );
    return updated;
  }

  async activateMultisig(stokvelId: string, actorId: string) {
    const actor = await this.requireMembership(stokvelId, actorId);
    if (actor.role !== 'ADMIN')
      throw new ForbiddenException(
        'Only the stokvel admin can activate multisig',
      );

    const stokvel = await this.prisma.stokvel.findUnique({
      where: { id: stokvelId },
    });
    if (!stokvel) throw new NotFoundException('Stokvel not found');
    if (stokvel.multisigActive)
      throw new BadRequestException('Multisig is already active');
    if (!stokvel.xrplSeed)
      throw new BadRequestException('Stokvel wallet not set up');

    const committee = await this.prisma.stokvelMember.findMany({
      where: {
        stokvelId,
        status: 'ACTIVE',
        role: { in: ['COMMITTEE', 'ADMIN'] },
      },
      include: { user: { include: { wallet: true } } },
    });
    if (committee.length < stokvel.signerQuorum) {
      throw new BadRequestException(
        `Need at least ${stokvel.signerQuorum} committee members before activating multisig (have ${committee.length})`,
      );
    }

    const signerAddresses: string[] = [];
    for (const c of committee) {
      const addr = c.user.wallet?.encryptedSeed
        ? await this.xrpl.ensureFunded(c.user.wallet.encryptedSeed)
        : null;
      if (!addr)
        throw new BadRequestException(
          `Committee member ${c.user.username} has no XRPL identity`,
        );
      signerAddresses.push(addr);
    }

    await this.xrpl.activateMultisig(
      stokvel.xrplSeed,
      signerAddresses,
      stokvel.signerQuorum,
    );

    const updated = await this.prisma.stokvel.update({
      where: { id: stokvelId },
      data: { multisigActive: true, multisigActivatedAt: new Date() },
    });
    await this.log(
      stokvelId,
      actorId,
      'MULTISIG_ACTIVATED',
      `${signerAddresses.length} committee signers, quorum ${stokvel.signerQuorum}. Creator key disabled — no individual, including Guranda, can move funds alone.`,
    );
    return updated;
  }

  // ── Contributions ─────────────────────────────────────────────────────────

  async contribute(stokvelId: string, userId: string, amountXrp?: number) {
    const member = await this.requireMembership(stokvelId, userId);
    const stokvel = await this.prisma.stokvel.findUnique({
      where: { id: stokvelId },
    });
    if (!stokvel?.xrplAddress) throw new NotFoundException('Stokvel not found');

    const amount =
      amountXrp && amountXrp > 0 ? amountXrp : stokvel.contributionAmount;
    const wallet = await this.personalWallet(userId);
    await this.xrpl.ensureFunded(wallet.encryptedSeed!);

    const txHash = await this.xrpl.sendPayment(
      wallet.encryptedSeed!,
      stokvel.xrplAddress,
      amount,
    );

    const contribution = await this.prisma.stokvelContribution.create({
      data: {
        stokvelId,
        memberId: member.id,
        amountXrp: amount,
        xrplTxHash: txHash,
        status: 'SUCCESS',
      },
    });
    await this.log(
      stokvelId,
      userId,
      'CONTRIBUTION',
      `${amount} XRP — tx ${txHash}`,
    );
    return contribution;
  }

  async myContributions(stokvelId: string, userId: string) {
    const member = await this.requireMembership(stokvelId, userId);
    return this.prisma.stokvelContribution.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listContributions(stokvelId: string, userId: string) {
    await this.requireMembership(stokvelId, userId);
    return this.prisma.stokvelContribution.findMany({
      where: { stokvelId },
      include: {
        member: {
          include: {
            user: { select: { id: true, username: true, profile: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Funding requests / voting / committee signing ────────────────────────

  async createRequest(stokvelId: string, userId: string, dto: any) {
    await this.requireMembership(stokvelId, userId);
    if (!dto.title?.trim() || !dto.amountXrp || dto.amountXrp <= 0) {
      throw new BadRequestException('Title and a positive amount are required');
    }
    const request = await this.prisma.stokvelFundingRequest.create({
      data: {
        stokvelId,
        requesterId: userId,
        title: dto.title.trim(),
        description: dto.description || null,
        amountXrp: dto.amountXrp,
        recipientAddress: dto.recipientAddress || null,
      },
    });
    await this.log(
      stokvelId,
      userId,
      'REQUEST_SUBMITTED',
      `"${request.title}" for ${request.amountXrp} XRP`,
    );
    return request;
  }

  async listRequests(stokvelId: string, userId: string) {
    await this.requireMembership(stokvelId, userId);
    return this.prisma.stokvelFundingRequest.findMany({
      where: { stokvelId },
      include: {
        requester: { select: { id: true, username: true, profile: true } },
        votes: true,
        signatures: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRequest(requestId: string, userId: string) {
    const request = await this.prisma.stokvelFundingRequest.findUnique({
      where: { id: requestId },
      include: {
        stokvel: true,
        requester: { select: { id: true, username: true, profile: true } },
        votes: {
          include: {
            member: {
              include: {
                user: { select: { id: true, username: true, profile: true } },
              },
            },
          },
        },
        signatures: {
          include: {
            member: {
              include: {
                user: { select: { id: true, username: true, profile: true } },
              },
            },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    await this.requireMembership(request.stokvelId, userId);
    return request;
  }

  async vote(requestId: string, userId: string, choice: 'APPROVE' | 'REJECT') {
    const request = await this.prisma.stokvelFundingRequest.findUnique({
      where: { id: requestId },
      include: { stokvel: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'VOTING')
      throw new BadRequestException(
        'This request is no longer open for voting',
      );
    const member = await this.requireMembership(request.stokvelId, userId);

    const existing = await this.prisma.stokvelVote.findUnique({
      where: { requestId_memberId: { requestId, memberId: member.id } },
    });
    if (existing)
      throw new BadRequestException('You have already voted on this request');

    await this.prisma.stokvelVote.create({
      data: { requestId, memberId: member.id, choice },
    });
    await this.log(
      request.stokvelId,
      userId,
      'VOTE_CAST',
      `${choice} on "${request.title}"`,
    );

    const totalMembers = await this.prisma.stokvelMember.count({
      where: { stokvelId: request.stokvelId, status: 'ACTIVE' },
    });
    const votes = await this.prisma.stokvelVote.findMany({
      where: { requestId },
    });
    const approvals = votes.filter((v) => v.choice === 'APPROVE').length;
    const rejections = votes.filter((v) => v.choice === 'REJECT').length;
    const threshold = request.stokvel.votingThresholdPct;

    if ((approvals / totalMembers) * 100 >= threshold) {
      await this.approveRequest(request.id, request.stokvel);
    } else if ((rejections / totalMembers) * 100 > 100 - threshold) {
      await this.prisma.stokvelFundingRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', resolvedAt: new Date() },
      });
      await this.log(
        request.stokvelId,
        null,
        'REQUEST_REJECTED',
        `"${request.title}" could not reach ${threshold}% approval`,
      );
    }

    return this.getRequest(requestId, userId);
  }

  private async approveRequest(
    requestId: string,
    stokvel: { id: string; signerQuorum: number; xrplAddress: string | null },
  ) {
    const request = await this.prisma.stokvelFundingRequest.findUnique({
      where: { id: requestId },
      include: { requester: { include: { wallet: true } } },
    });
    if (!request || !stokvel.xrplAddress) return;

    const recipient =
      request.recipientAddress || request.requester.wallet?.xrplAddress;
    if (!recipient)
      throw new BadRequestException(
        'Requester has no XRPL address to release funds to',
      );

    const preparedTx = await this.xrpl.preparePayment(
      stokvel.xrplAddress,
      recipient,
      request.amountXrp,
      stokvel.signerQuorum,
    );

    await this.prisma.stokvelFundingRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', preparedTx: JSON.stringify(preparedTx) },
    });
    await this.log(
      stokvel.id,
      null,
      'REQUEST_APPROVED',
      `"${request.title}" reached approval threshold — awaiting ${stokvel.signerQuorum} committee signatures`,
    );
  }

  // If the prepared release transaction's validity window has lapsed
  // (committee sign-off can take a while in practice), re-prepare a
  // fresh one and clear any signatures collected against the stale copy —
  // they were signed over now-invalid transaction fields.
  private async refreshPreparedTxIfExpired(
    request: {
      id: string;
      stokvelId: string;
      title: string;
      amountXrp: number;
      recipientAddress: string | null;
      preparedTx: string;
    },
    stokvel: { xrplAddress: string | null; signerQuorum: number },
  ) {
    const preparedTx = JSON.parse(request.preparedTx);
    const currentLedger = await this.xrpl.getLedgerIndex();
    if (!this.xrpl.isPreparedTxExpired(preparedTx, currentLedger))
      return preparedTx;

    const full = await this.prisma.stokvelFundingRequest.findUnique({
      where: { id: request.id },
      include: { requester: { include: { wallet: true } } },
    });
    const recipient =
      request.recipientAddress || full?.requester.wallet?.xrplAddress;
    if (!stokvel.xrplAddress || !recipient)
      throw new BadRequestException(
        'Cannot refresh release transaction — missing wallet address',
      );

    const freshTx = await this.xrpl.preparePayment(
      stokvel.xrplAddress,
      recipient,
      request.amountXrp,
      stokvel.signerQuorum,
    );
    await this.prisma.$transaction([
      this.prisma.stokvelSignature.deleteMany({
        where: { requestId: request.id },
      }),
      this.prisma.stokvelFundingRequest.update({
        where: { id: request.id },
        data: { preparedTx: JSON.stringify(freshTx) },
      }),
    ]);
    await this.log(
      request.stokvelId,
      null,
      'REQUEST_RESIGNED',
      `"${request.title}" release window expired — committee needs to sign again`,
    );
    return freshTx;
  }

  async signRequest(requestId: string, userId: string) {
    const request = await this.prisma.stokvelFundingRequest.findUnique({
      where: { id: requestId },
      include: { stokvel: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'APPROVED' || !request.preparedTx) {
      throw new BadRequestException(
        'This request has not reached committee sign-off stage yet',
      );
    }
    const member = await this.requireMembership(request.stokvelId, userId);
    if (member.role !== 'COMMITTEE' && member.role !== 'ADMIN')
      throw new ForbiddenException(
        'Only committee members can sign fund releases',
      );

    await this.refreshPreparedTxIfExpired(request as any, request.stokvel);
    const fresh = await this.prisma.stokvelFundingRequest.findUnique({
      where: { id: requestId },
    });
    const preparedTx = JSON.parse(fresh!.preparedTx!);

    const existing = await this.prisma.stokvelSignature.findUnique({
      where: { requestId_memberId: { requestId, memberId: member.id } },
    });
    if (existing)
      throw new BadRequestException('You have already signed this request');

    const wallet = await this.personalWallet(userId);
    const txBlob = this.xrpl.signPrepared(preparedTx, wallet.encryptedSeed!);

    await this.prisma.stokvelSignature.create({
      data: { requestId, memberId: member.id, txBlob },
    });
    await this.log(
      request.stokvelId,
      userId,
      'REQUEST_SIGNED',
      `Committee signature ${await this.prisma.stokvelSignature.count({ where: { requestId } })}/${request.stokvel.signerQuorum} on "${request.title}"`,
    );

    const signatures = await this.prisma.stokvelSignature.findMany({
      where: { requestId },
    });
    if (signatures.length >= request.stokvel.signerQuorum) {
      try {
        const txHash = await this.xrpl.submitMultisigned(
          signatures.map((s) => s.txBlob),
        );
        await this.prisma.stokvelFundingRequest.update({
          where: { id: requestId },
          data: {
            status: 'RELEASED',
            xrplTxHash: txHash,
            resolvedAt: new Date(),
          },
        });
        await this.log(
          request.stokvelId,
          null,
          'FUNDS_RELEASED',
          `"${request.title}" — ${request.amountXrp} XRP released, tx ${txHash}`,
        );
      } catch (e: any) {
        await this.refreshPreparedTxIfExpired(
          { ...request, preparedTx: fresh!.preparedTx! },
          request.stokvel,
        );
        throw new BadRequestException(
          `Release failed (${e.message}) — the committee will need to sign again`,
        );
      }
    }

    return this.getRequest(requestId, userId);
  }

  // ── Reports / audit ───────────────────────────────────────────────────────

  async getReport(stokvelId: string, userId: string) {
    await this.requireMembership(stokvelId, userId);
    const stokvel = await this.prisma.stokvel.findUnique({
      where: { id: stokvelId },
    });
    if (!stokvel) throw new NotFoundException('Stokvel not found');

    const [contributions, requests, memberCount] = await Promise.all([
      this.prisma.stokvelContribution.findMany({ where: { stokvelId } }),
      this.prisma.stokvelFundingRequest.findMany({ where: { stokvelId } }),
      this.prisma.stokvelMember.count({
        where: { stokvelId, status: 'ACTIVE' },
      }),
    ]);

    const totalContributed = contributions.reduce(
      (sum, c) => sum + c.amountXrp,
      0,
    );
    const totalReleased = requests
      .filter((r) => r.status === 'RELEASED')
      .reduce((sum, r) => sum + r.amountXrp, 0);
    const balanceXrp = stokvel.xrplAddress
      ? await this.xrpl.getBalance(stokvel.xrplAddress)
      : 0;

    return {
      memberCount,
      totalContributed,
      totalReleased,
      balanceXrp,
      contributionCount: contributions.length,
      pendingRequests: requests.filter(
        (r) => r.status === 'VOTING' || r.status === 'APPROVED',
      ).length,
      releasedRequests: requests.filter((r) => r.status === 'RELEASED').length,
    };
  }

  async getAuditLog(stokvelId: string, userId: string) {
    await this.requireMembership(stokvelId, userId);
    return this.prisma.stokvelAuditLog.findMany({
      where: { stokvelId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
