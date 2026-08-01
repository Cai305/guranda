import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';
import type { RelationshipStatusType } from '@prisma/client';

const AUTHOR_SELECT = {
  id: true,
  username: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} as const;

function toFlatAuthor(user: any) {
  if (!user) return user;
  const { profile, ...rest } = user;
  return { ...rest, ...profile };
}

@Injectable()
export class RelationshipsService {
  constructor(private prisma: PrismaService) {}

  private async hasActiveRelationship(userId: string): Promise<boolean> {
    const existing = await this.prisma.relationship.findFirst({
      where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
    });
    return !!existing;
  }

  async sendRequest(requesterId: string, partnerId: string, intendedStatus: RelationshipStatusType = 'IN_RELATIONSHIP') {
    if (requesterId === partnerId) {
      throw new BadRequestException('You cannot send yourself a relationship request');
    }
    if (await this.hasActiveRelationship(requesterId)) {
      throw new BadRequestException('You already have an active relationship linked');
    }
    if (await this.hasActiveRelationship(partnerId)) {
      throw new BadRequestException('That person already has an active relationship linked');
    }

    const existing = await this.prisma.relationshipRequest.findFirst({
      where: {
        OR: [
          { requesterId, partnerId },
          { requesterId: partnerId, partnerId: requesterId },
        ],
      },
    });
    if (existing) {
      if (existing.status === 'accepted') return existing;
      if (existing.status === 'pending' && existing.requesterId === partnerId) {
        // They'd already asked us — treat this as accepting their request.
        return this.acceptRequest(existing.id, requesterId);
      }
      if (existing.status === 'pending') return existing; // already sent, no-op
      return this.prisma.relationshipRequest.update({
        where: { id: existing.id },
        data: { requesterId, partnerId, status: 'pending', intendedStatus },
      });
    }

    const request = await this.prisma.relationshipRequest.create({
      data: { requesterId, partnerId, status: 'pending', intendedStatus },
    });
    const partner = await this.prisma.user.findUnique({ where: { id: partnerId } });
    if (partner?.expoPushToken) {
      await sendPushNotification(
        partner.expoPushToken,
        'New relationship request',
        'Someone wants to link up as a couple on Guranda',
      );
    }
    return request;
  }

  async acceptRequest(requestId: string, userId: string) {
    const request = await this.prisma.relationshipRequest.findUnique({ where: { id: requestId } });
    if (!request || request.partnerId !== userId) {
      throw new NotFoundException('Relationship request not found');
    }
    if (await this.hasActiveRelationship(request.requesterId)) {
      throw new BadRequestException('The requester already has an active relationship linked');
    }
    if (await this.hasActiveRelationship(userId)) {
      throw new BadRequestException('You already have an active relationship linked');
    }

    const [, relationship] = await this.prisma.$transaction([
      this.prisma.relationshipRequest.update({ where: { id: requestId }, data: { status: 'accepted' } }),
      this.prisma.relationship.create({
        data: { userAId: request.requesterId, userBId: userId },
      }),
      this.prisma.userProfile.update({
        where: { userId: request.requesterId },
        data: { relationshipStatus: request.intendedStatus },
      }),
      this.prisma.userProfile.update({
        where: { userId },
        data: { relationshipStatus: request.intendedStatus },
      }),
    ]);
    return relationship;
  }

  async declineRequest(requestId: string, userId: string) {
    const request = await this.prisma.relationshipRequest.findUnique({ where: { id: requestId } });
    if (!request || request.partnerId !== userId) {
      throw new NotFoundException('Relationship request not found');
    }
    return this.prisma.relationshipRequest.update({ where: { id: requestId }, data: { status: 'declined' } });
  }

  async listPending(userId: string) {
    return this.prisma.relationshipRequest.findMany({
      where: { status: 'pending', partnerId: userId },
      include: { requester: { select: AUTHOR_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMine(userId: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: { status: 'active', OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: AUTHOR_SELECT },
        userB: { select: AUTHOR_SELECT },
      },
    });
    if (!relationship) return null;

    const { userA, userB, ...rest } = relationship;
    const partner = relationship.userAId === userId ? userB : userA;
    return {
      ...rest,
      partner: toFlatAuthor(partner),
      rank: rankForXp(relationship.xp),
    };
  }

  async updateStatus(userId: string, status: RelationshipStatusType) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: { relationshipStatus: status },
    });
  }
}

const RANK_THRESHOLDS: { min: number; name: string }[] = [
  { min: 6000, name: 'Legendary Couple' },
  { min: 3000, name: 'Diamond Couple' },
  { min: 1500, name: 'Platinum Couple' },
  { min: 700, name: 'Gold Couple' },
  { min: 300, name: 'Silver Couple' },
  { min: 100, name: 'Bronze Couple' },
  { min: 0, name: 'New Couple' },
];

// Derived from xp on read, not stored — avoids a second field that can
// drift out of sync with the source-of-truth xp value.
export function rankForXp(xp: number): string {
  return RANK_THRESHOLDS.find((t) => xp >= t.min)!.name;
}
