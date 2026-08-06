import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type MentionRef = { targetType: string; targetId: string };

/**
 * One shared model for every "@thing" reference instead of a parser per
 * surface (chat, posts, comments, status). `record()` takes already-resolved
 * {targetType, targetId} pairs — resolving free text into those pairs is a
 * client-side autocomplete concern (the client already knows the exact
 * user/product/etc id it's referencing when it inserts a mention chip), not
 * a server-side NLP guess, so this stays a thin, reliable storage layer
 * rather than a fragile text parser.
 */
@Injectable()
export class MentionsService {
  constructor(private prisma: PrismaService) {}

  /** Pass `tx` to write inside an existing transaction (e.g. alongside the post/message that carries the mentions). */
  record(
    sourceType: string,
    sourceId: string,
    mentions: MentionRef[],
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    if (!mentions.length) return Promise.resolve({ count: 0 });
    return tx.mention.createMany({
      data: mentions.map((m) => ({
        sourceType,
        sourceId,
        targetType: m.targetType,
        targetId: m.targetId,
      })),
    });
  }

  /** Everything that mentions a given target — e.g. "posts mentioning this product". */
  async findMentionsOf(targetType: string, targetId: string) {
    return this.prisma.mention.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Everything a given source (a post, a chat message, ...) mentions. */
  async findMentionsIn(sourceType: string, sourceId: string) {
    return this.prisma.mention.findMany({
      where: { sourceType, sourceId },
    });
  }
}
