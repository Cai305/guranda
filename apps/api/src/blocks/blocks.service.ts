import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// A single source of truth for "does a block exist between these two
// people" — used from chat (messaging + calls), friends (requests), and
// posts (feed/comments/profile visibility) so blocking behaves the same
// everywhere instead of each module reimplementing its own check.
@Injectable()
export class BlocksService {
  constructor(private prisma: PrismaService) {}

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }
    return this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { ok: true };
  }

  async listBlocked(blockerId: string) {
    const rows = await this.prisma.block.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.blocked.id,
      username: r.blocked.username,
      displayName: r.blocked.profile?.displayName ?? null,
      avatarUrl: r.blocked.profile?.avatarUrl ?? null,
      blockedAt: r.createdAt,
    }));
  }

  /** Ids blocked in EITHER direction relative to userId — feed/search/discovery filters. */
  async getBlockedEitherDirection(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const r of rows) ids.add(r.blockerId === userId ? r.blockedId : r.blockerId);
    return ids;
  }

  /** Pairwise check — chat/call/friend-request gates that only involve two people. */
  async isBlockedEitherDirection(userIdA: string, userIdB: string): Promise<boolean> {
    const row = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userIdA, blockedId: userIdB },
          { blockerId: userIdB, blockedId: userIdA },
        ],
      },
    });
    return !!row;
  }
}
