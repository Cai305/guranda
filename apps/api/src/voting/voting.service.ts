import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { XrplService } from '../finance/xrpl.service';
import { VerificationService } from '../verification/verification.service';
import { TallyService } from './tally.service';

const MEMBER_SELECT = {
  include: { user: { select: { id: true, username: true, profile: true } } },
};

@Injectable()
export class VotingService {
  constructor(
    private prisma: PrismaService,
    private xrpl: XrplService,
    private verification: VerificationService,
    private tallyService: TallyService,
  ) {}

  private async requireMembership(structureId: string, userId: string) {
    const member = await this.prisma.structureMember.findUnique({
      where: { structureId_userId: { structureId, userId } },
    });
    if (!member || member.status !== 'ACTIVE')
      throw new ForbiddenException('You are not on this structure\'s roll');
    return member;
  }

  private async requireAdmin(structureId: string, userId: string) {
    const member = await this.requireMembership(structureId, userId);
    if (member.role !== 'ADMIN')
      throw new ForbiddenException('Only a structure admin can do this');
    return member;
  }

  private async personalWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet?.xrplAddress || !wallet.encryptedSeed) {
      throw new BadRequestException('Your Guranda wallet has no XRPL identity yet');
    }
    return wallet;
  }

  // ── Structures & roll ────────────────────────────────────────────────────

  async createStructure(userId: string, dto: { name: string; type: string }) {
    const structure = await this.prisma.structure.create({
      data: { name: dto.name.trim(), type: dto.type, creatorId: userId },
    });
    await this.prisma.structureMember.create({
      data: { structureId: structure.id, userId, role: 'ADMIN' },
    });
    return structure;
  }

  async myStructures(userId: string) {
    const memberships = await this.prisma.structureMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        structure: {
          include: {
            elections: { orderBy: { createdAt: 'desc' } },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.structure, myRole: m.role, myVotingWeight: m.votingWeight }));
  }

  async getStructure(structureId: string, userId: string) {
    const member = await this.requireMembership(structureId, userId);
    const structure = await this.prisma.structure.findUnique({
      where: { id: structureId },
      include: {
        members: { ...MEMBER_SELECT, where: { status: 'ACTIVE' }, orderBy: { joinedAt: 'asc' } },
        elections: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!structure) throw new NotFoundException('Structure not found');
    return { ...structure, myRole: member.role };
  }

  async addMember(structureId: string, actorId: string, dto: { username: string; votingWeight?: number }) {
    await this.requireAdmin(structureId, actorId);
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user) throw new NotFoundException(`No user "${dto.username}"`);

    const existing = await this.prisma.structureMember.findUnique({
      where: { structureId_userId: { structureId, userId: user.id } },
    });
    if (existing) throw new BadRequestException('Already on the roll');

    return this.prisma.structureMember.create({
      data: { structureId, userId: user.id, votingWeight: dto.votingWeight || 1 },
      ...MEMBER_SELECT,
    });
  }

  // ── Elections / positions / candidates (admin authoring) ────────────────

  async createElection(structureId: string, actorId: string, dto: { title: string; opensAt?: string; closesAt?: string }) {
    await this.requireAdmin(structureId, actorId);
    const { address, encodedSeed } = await this.xrpl.createFundedWallet();
    return this.prisma.election.create({
      data: {
        structureId,
        title: dto.title.trim(),
        opensAt: dto.opensAt ? new Date(dto.opensAt) : undefined,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined,
        ballotBoxXrplAddress: address,
        ballotBoxXrplSeed: encodedSeed,
      },
    });
  }

  private async electionAdminGuard(electionId: string, actorId: string) {
    const election = await this.prisma.election.findUnique({ where: { id: electionId } });
    if (!election) throw new NotFoundException('Election not found');
    await this.requireAdmin(election.structureId, actorId);
    return election;
  }

  async createPosition(electionId: string, actorId: string, dto: { title: string; votingType: string; seats?: number }) {
    await this.electionAdminGuard(electionId, actorId);
    return this.prisma.position.create({
      data: {
        electionId,
        title: dto.title.trim(),
        votingType: dto.votingType,
        seats: dto.seats || 1,
      },
    });
  }

  async createCandidate(positionId: string, actorId: string, dto: { name: string; slateName?: string; colorHex?: string }) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: { election: true },
    });
    if (!position) throw new NotFoundException('Position not found');
    await this.requireAdmin(position.election.structureId, actorId);
    return this.prisma.candidate.create({
      data: {
        positionId,
        name: dto.name.trim(),
        slateName: dto.slateName || null,
        colorHex: dto.colorHex || null,
      },
    });
  }

  // ── Voter journey ─────────────────────────────────────────────────────────

  async getElection(electionId: string, userId: string) {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: {
        structure: true,
        positions: { include: { candidates: true }, orderBy: { title: 'asc' } },
      },
    });
    if (!election) throw new NotFoundException('Election not found');
    const member = await this.requireMembership(election.structureId, userId);

    const checkIn = await this.prisma.electionCheckIn.findUnique({
      where: { electionId_structureMemberId: { electionId, structureMemberId: member.id } },
    });

    const myVotes = await this.prisma.electionVote.findMany({
      where: { structureMemberId: member.id, position: { electionId } },
      select: { positionId: true, xrplTxHash: true },
    });
    const votedPositionIds = new Set(myVotes.map((v) => v.positionId));

    return {
      ...election,
      myRole: member.role,
      myVotingWeight: member.votingWeight,
      myCheckedIn: !!checkIn,
      positions: election.positions.map((p) => ({
        ...p,
        myVoted: votedPositionIds.has(p.id),
      })),
    };
  }

  async checkIn(electionId: string, userId: string, method: 'FINGERPRINT' | 'FACE_ID') {
    await this.verification.assertVerified(userId, 'Voting');
    const election = await this.prisma.election.findUnique({ where: { id: electionId } });
    if (!election) throw new NotFoundException('Election not found');
    const member = await this.requireMembership(election.structureId, userId);

    const existing = await this.prisma.electionCheckIn.findUnique({
      where: { electionId_structureMemberId: { electionId, structureMemberId: member.id } },
    });
    if (existing) return existing;

    return this.prisma.electionCheckIn.create({
      data: { electionId, structureMemberId: member.id, method },
    });
  }

  async castVote(positionId: string, userId: string, selection: Record<string, any>) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: { election: true, candidates: true },
    });
    if (!position) throw new NotFoundException('Position not found');
    if (position.election.status !== 'OPEN')
      throw new BadRequestException('This election is not open for voting');

    const member = await this.requireMembership(position.election.structureId, userId);

    const checkIn = await this.prisma.electionCheckIn.findUnique({
      where: {
        electionId_structureMemberId: { electionId: position.electionId, structureMemberId: member.id },
      },
    });
    if (!checkIn)
      throw new ForbiddenException('Complete biometric check-in before voting');

    const existingVote = await this.prisma.electionVote.findUnique({
      where: { positionId_structureMemberId: { positionId, structureMemberId: member.id } },
    });
    if (existingVote)
      throw new BadRequestException('You have already voted for this position');

    this.validateSelection(position, member.votingWeight, selection);

    const wallet = await this.personalWallet(userId);
    await this.xrpl.ensureFunded(wallet.encryptedSeed!);
    if (!position.election.ballotBoxXrplAddress)
      throw new BadRequestException('Election ballot box is not set up');

    const receipt = await this.xrpl.sendMemoPayment(
      wallet.encryptedSeed!,
      position.election.ballotBoxXrplAddress,
      { positionId, structureId: position.election.structureId },
    );

    return this.prisma.electionVote.create({
      data: {
        positionId,
        structureMemberId: member.id,
        selection,
        xrplTxHash: receipt.hash,
        xrplLedgerIndex: receipt.ledgerIndex,
      },
    });
  }

  private validateSelection(
    position: { votingType: string; seats: number; candidates: { id: string }[] },
    votingWeight: number,
    selection: Record<string, any>,
  ) {
    const validIds = new Set(position.candidates.map((c) => c.id));

    switch (position.votingType) {
      case 'SINGLE_CHOICE': {
        if (!selection.candidateId || !validIds.has(selection.candidateId))
          throw new BadRequestException('Choose one valid candidate');
        return;
      }
      case 'MULTI_SELECT': {
        const ids: string[] = selection.candidateIds;
        if (!Array.isArray(ids) || ids.length === 0)
          throw new BadRequestException('Choose at least one candidate');
        if (new Set(ids).size !== ids.length)
          throw new BadRequestException('Duplicate candidate in selection');
        if (ids.length > position.seats)
          throw new BadRequestException(`You may select at most ${position.seats} candidates`);
        if (!ids.every((id) => validIds.has(id)))
          throw new BadRequestException('Selection contains an unknown candidate');
        return;
      }
      case 'RANKED_CHOICE': {
        const ids: string[] = selection.rankedCandidateIds;
        if (!Array.isArray(ids) || ids.length === 0)
          throw new BadRequestException('Rank at least one candidate');
        if (new Set(ids).size !== ids.length)
          throw new BadRequestException('Duplicate candidate in ranking');
        if (!ids.every((id) => validIds.has(id)))
          throw new BadRequestException('Ranking contains an unknown candidate');
        return;
      }
      case 'WEIGHTED': {
        const allocations: Record<string, number> = selection.allocations;
        if (!allocations || typeof allocations !== 'object' || Array.isArray(allocations))
          throw new BadRequestException('Provide an allocation per candidate');
        const entries = Object.entries(allocations);
        if (entries.length === 0)
          throw new BadRequestException('Allocate at least some voting power');
        let total = 0;
        for (const [candidateId, amount] of entries) {
          if (!validIds.has(candidateId))
            throw new BadRequestException('Allocation contains an unknown candidate');
          if (typeof amount !== 'number' || amount < 0)
            throw new BadRequestException('Allocations must be non-negative numbers');
          total += amount;
        }
        if (total > votingWeight)
          throw new BadRequestException(`Allocated ${total} exceeds your voting power of ${votingWeight}`);
        return;
      }
      default:
        throw new BadRequestException('Unknown voting type');
    }
  }

  // ── Results ──────────────────────────────────────────────────────────────

  async getResults(positionId: string) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: { candidates: true, votes: true },
    });
    if (!position) throw new NotFoundException('Position not found');
    return this.tallyService.tally(position, position.votes);
  }
}
