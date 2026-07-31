import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Durable record of real user/assistant exchanges — separate from the raw
// per-request `conversation` array (which is ephemeral, client-held, and
// full of intermediate tool_use/tool_result chatter). This is what gives the
// AI (and the mobile chat screen) real continuity across sessions: "access
// to old conversations", not just whatever's still open in memory.
@Injectable()
export class ConversationHistoryService {
  constructor(private prisma: PrismaService) {}

  // companionId stays undefined/null for the user's own personal AiAgent
  // (existing behavior, unchanged) — pass a FIXED_COMPANIONS id to keep a
  // platform persona's (Sipho/Thandi/Guranda Assistant) history isolated
  // from that and from each other's.
  async record(
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    companionId: string | null = null,
  ): Promise<void> {
    if (!content?.trim()) return;
    await this.prisma.aiConversationMessage.create({
      data: { userId, companionId, role, content },
    });
  }

  async getRecent(
    userId: string,
    limit = 50,
    companionId: string | null = null,
  ) {
    const rows = await this.prisma.aiConversationMessage.findMany({
      where: { userId, companionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse(); // oldest first, ready to render top-to-bottom
  }

  /** Compact text block for the system prompt — real continuity without replaying full history as live turns. */
  async getRecentSummary(
    userId: string,
    exchanges = 6,
    companionId: string | null = null,
  ): Promise<string | null> {
    const rows = await this.prisma.aiConversationMessage.findMany({
      where: { userId, companionId },
      orderBy: { createdAt: 'desc' },
      take: exchanges * 2,
    });
    if (rows.length === 0) return null;
    return rows
      .reverse()
      .map((r) => `${r.role === 'user' ? 'User' : 'You'}: ${r.content}`)
      .join('\n');
  }
}
