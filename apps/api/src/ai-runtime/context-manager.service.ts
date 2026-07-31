import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Tracks what the AI is currently doing for a given user, persisted across
// chat turns (unlike the raw conversation array, which today only lives in
// the mobile client's local state and is round-tripped on every request).
@Injectable()
export class ContextManagerService {
  constructor(private prisma: PrismaService) {}

  async touch(
    userId: string,
    update: { activeModule?: string; taskSummary?: string },
  ): Promise<void> {
    await this.prisma.aiSession.upsert({
      where: { userId },
      update,
      create: { userId, ...update },
    });
  }

  async get(userId: string) {
    return this.prisma.aiSession.findUnique({ where: { userId } });
  }
}
