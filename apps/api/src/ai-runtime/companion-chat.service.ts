import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConversationHistoryService } from './conversation-history.service';
import { LLM_ADAPTER } from './llm-adapter.token';
import type { LlmAdapter } from './llm-adapter.interface';
import { FIXED_COMPANIONS, getFixedCompanion } from './fixed-companions';

// A deliberately simple sibling to AgentRuntimeService's runLoop(): no tool
// registry, no ActionExecutor, no permissions — Sipho/Thandi/Guranda
// Assistant are pure conversation, one LLM call per turn, no approval loop.
@Injectable()
export class CompanionChatService {
  constructor(
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
    private prisma: PrismaService,
    private conversationHistory: ConversationHistoryService,
  ) {}

  listCompanions() {
    return FIXED_COMPANIONS.map((c) => ({
      id: c.id,
      name: c.name,
      tagline: c.tagline,
    }));
  }

  async getHistory(userId: string, companionId: string) {
    if (!getFixedCompanion(companionId))
      throw new NotFoundException('Unknown companion');
    return this.conversationHistory.getRecent(userId, 50, companionId);
  }

  async chat(
    userId: string,
    companionId: string,
    message: string,
  ): Promise<{ reply: string }> {
    const companion = getFixedCompanion(companionId);
    if (!companion) throw new NotFoundException('Unknown companion');

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const recentHistory = await this.conversationHistory.getRecentSummary(
      userId,
      6,
      companionId,
    );
    const system = companion.systemPrompt(
      profile?.displayName || 'there',
      recentHistory,
    );

    await this.conversationHistory.record(userId, 'user', message, companionId);

    const turn = await this.llm.runTurn({
      system,
      messages: [{ role: 'user', content: message }],
      tools: [],
    });

    await this.conversationHistory.record(
      userId,
      'assistant',
      turn.content,
      companionId,
    );
    return { reply: turn.content };
  }
}
