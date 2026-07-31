import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CommunitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.community.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async findUserCommunities(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId },
      include: {
        community: {
          include: { _count: { select: { members: true } } },
        },
      },
    });
    return memberships.map((m) => m.community);
  }

  async getCommunityDetails(id: string) {
    return this.prisma.community.findUnique({
      where: { id },
      include: {
        rooms: true,
        _count: { select: { members: true } },
      },
    });
  }

  async joinCommunity(userId: string, communityId: string) {
    try {
      await this.prisma.communityMember.create({
        data: { userId, communityId },
      });
      return { status: 'joined' };
    } catch {
      // Already joined
      return { status: 'already_joined' };
    }
  }

  async createCommunity(
    userId: string,
    name: string,
    description?: string,
    iconUrl?: string,
  ) {
    const community = await this.prisma.community.create({
      data: {
        name,
        description,
        iconUrl,
        members: {
          create: [{ userId, role: 'ADMIN' }],
        },
        rooms: {
          create: [{ name: 'General', type: 'CHANNEL' }],
        },
      },
    });
    return community;
  }
}
