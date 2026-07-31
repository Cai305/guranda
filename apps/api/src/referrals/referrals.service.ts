import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';

const REFERRAL_REWARD_MSH = 20;

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async ensureReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.referralCode) return user.referralCode;

    // Small retry loop for the unlikely event of a collision on the unique column.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(4).toString('hex');
      try {
        const updated = await this.prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
        return updated.referralCode!;
      } catch {
        continue;
      }
    }
    throw new Error('Could not generate a unique referral code');
  }

  async redeem(refereeId: string, code: string) {
    const referrer = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!referrer) throw new BadRequestException('Invalid referral code');
    if (referrer.id === refereeId) throw new BadRequestException('You cannot redeem your own referral code');

    const existing = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (existing) throw new BadRequestException('You have already redeemed a referral code');

    return this.prisma.referral.create({
      data: { referrerId: referrer.id, refereeId, rewardStatus: 'pending', rewardAmount: REFERRAL_REWARD_MSH },
    });
  }

  async listMine(userId: string) {
    return this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referee: { select: { id: true, username: true, profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Called once a referee completes their first wagered card game. */
  async rewardIfEligible(refereeId: string) {
    const referral = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (!referral || referral.rewardStatus === 'paid') return;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId: referral.referrerId } });
    if (!wallet) return;

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { increment: referral.rewardAmount } },
      }),
      this.prisma.transaction.create({
        data: { walletId: wallet.id, type: 'RECEIVE', status: 'SUCCESS', amount: referral.rewardAmount },
      }),
      this.prisma.referral.update({ where: { refereeId }, data: { rewardStatus: 'paid' } }),
    ]);
  }
}
