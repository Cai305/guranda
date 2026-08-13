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
    update: { activeModule?: string; taskSummary?: string; activeAgentId?: string | null },
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

  // Records the widget the user was just shown so a later short message
  // ("next", "the second one") can resolve against it without a fresh tool
  // call — see WidgetActionResolverService. Always resets selectedIndex to
  // 0: a brand-new widget replaces whatever was selected on the previous one.
  async touchWidget(
    userId: string,
    widget: { toolCallId: string; renderAs: string; itemCount: number },
  ): Promise<void> {
    await this.prisma.aiSession.upsert({
      where: { userId },
      update: {
        activeWidgetToolCallId: widget.toolCallId,
        activeWidgetRenderAs: widget.renderAs,
        activeWidgetItemCount: widget.itemCount,
        activeWidgetSelectedIndex: 0,
      },
      create: {
        userId,
        activeWidgetToolCallId: widget.toolCallId,
        activeWidgetRenderAs: widget.renderAs,
        activeWidgetItemCount: widget.itemCount,
        activeWidgetSelectedIndex: 0,
      },
    });
  }
}
