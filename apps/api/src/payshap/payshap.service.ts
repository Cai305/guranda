import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { FinancialEngineService } from '../wallets/financial-engine.service';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class PayShapService {
  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
    private financialEngine: FinancialEngineService,
    private blocksService: BlocksService,
  ) {}

  private async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.payShapProfile.findUnique({ where: { userId } });
    if (!profile) {
      // A profile with no number yet is still a real row — lets the mobile
      // client tell "never set one up" apart from "set up but unpayable",
      // and gives linkBank somewhere to attach to before a number exists.
      profile = await this.prisma.payShapProfile.create({
        data: { userId, number: `pending:${userId}`, linkedBankIds: [] },
      });
    }
    return profile;
  }

  async getMyProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return {
      number: profile.number.startsWith('pending:') ? '' : profile.number,
      linkedBankIds: profile.linkedBankIds,
      primaryBankId: profile.primaryBankId,
    };
  }

  async setNumber(userId: string, number: string) {
    const trimmed = number.trim();
    if (!trimmed) throw new BadRequestException('Enter a PayShap number');
    await this.getOrCreateProfile(userId);
    try {
      const updated = await this.prisma.payShapProfile.update({
        where: { userId },
        data: { number: trimmed },
      });
      return { number: updated.number, linkedBankIds: updated.linkedBankIds, primaryBankId: updated.primaryBankId };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('That PayShap number is already linked to another account');
      }
      throw e;
    }
  }

  async linkBank(userId: string, bankId: string) {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.linkedBankIds.includes(bankId)) {
      return { number: profile.number, linkedBankIds: profile.linkedBankIds, primaryBankId: profile.primaryBankId };
    }
    const linkedBankIds = [...profile.linkedBankIds, bankId];
    const primaryBankId = profile.primaryBankId ?? bankId;
    const updated = await this.prisma.payShapProfile.update({
      where: { userId },
      data: { linkedBankIds, primaryBankId },
    });
    return { number: updated.number, linkedBankIds: updated.linkedBankIds, primaryBankId: updated.primaryBankId };
  }

  async unlinkBank(userId: string, bankId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const linkedBankIds = profile.linkedBankIds.filter((b) => b !== bankId);
    const primaryBankId = profile.primaryBankId === bankId ? (linkedBankIds[0] ?? null) : profile.primaryBankId;
    const updated = await this.prisma.payShapProfile.update({
      where: { userId },
      data: { linkedBankIds, primaryBankId },
    });
    return { number: updated.number, linkedBankIds: updated.linkedBankIds, primaryBankId: updated.primaryBankId };
  }

  async setPrimaryBank(userId: string, bankId: string) {
    const profile = await this.getOrCreateProfile(userId);
    if (!profile.linkedBankIds.includes(bankId)) {
      throw new BadRequestException('Link that bank before making it primary');
    }
    const updated = await this.prisma.payShapProfile.update({
      where: { userId },
      data: { primaryBankId: bankId },
    });
    return { number: updated.number, linkedBankIds: updated.linkedBankIds, primaryBankId: updated.primaryBankId };
  }

  /** Resolves a PayShap number to who owns it and which banks they've linked — what a payer sees before choosing one. */
  async lookup(callerId: string, number: string) {
    const trimmed = number.trim();
    const profile = await this.prisma.payShapProfile.findUnique({
      where: { number: trimmed },
      include: { user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
    });
    if (!profile || profile.linkedBankIds.length === 0) {
      throw new NotFoundException('No payable PayShap account found for that number');
    }
    if (profile.userId === callerId) {
      throw new BadRequestException("That's your own PayShap number");
    }
    if (await this.blocksService.isBlockedEitherDirection(callerId, profile.userId)) {
      throw new NotFoundException('No payable PayShap account found for that number');
    }
    return {
      userId: profile.user.id,
      username: profile.user.username,
      displayName: profile.user.profile?.displayName ?? profile.user.username,
      avatarUrl: profile.user.profile?.avatarUrl ?? null,
      linkedBankIds: profile.linkedBankIds,
      primaryBankId: profile.primaryBankId,
    };
  }

  async sendViaPayShap(callerId: string, number: string, bankId: string, amount: string) {
    const recipient = await this.lookup(callerId, number);
    if (!recipient.linkedBankIds.includes(bankId)) {
      throw new BadRequestException('That bank is not linked to this PayShap number');
    }
    return this.walletsService.sendMasheleni(callerId, recipient.username, amount);
  }

  async requestViaPayShap(callerId: string, number: string, amount: string, memo?: string) {
    const payer = await this.lookup(callerId, number);
    return this.financialEngine.requestPayment(callerId, payer.username, amount, memo);
  }

  /** PayShap AirPay's radar: the real nearby-people scan, narrowed to people who have at least one linked bank, with their PayShap number/banks attached so the sheet can send straight through sendViaPayShap. */
  async getNearbyForAirPay(userId: string, radiusMeters: number) {
    const nearby = await this.walletsService.getNearbyForAirPay(userId, radiusMeters, false);
    if (nearby.needsLocation) return nearby;

    const userIds = nearby.people.map((p: any) => p.id);
    const profiles = await this.prisma.payShapProfile.findMany({
      where: { userId: { in: userIds }, linkedBankIds: { isEmpty: false } },
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    const people = nearby.people
      .filter((p: any) => profileByUserId.has(p.id))
      .map((p: any) => {
        const profile = profileByUserId.get(p.id)!;
        return {
          ...p,
          payshapNumber: profile.number,
          linkedBankIds: profile.linkedBankIds,
          primaryBankId: profile.primaryBankId,
        };
      });

    return { ...nearby, people };
  }
}
