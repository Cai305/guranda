import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PendingMcpAction } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ActionExecutorService } from '../ai-runtime/action-executor.service';
import { NotificationsService } from '../notifications/notifications.service';
import { sendPushNotification } from '../common/push';
import { ToolDefinition } from '../tool-registry/tool-registry.types';

const PENDING_TTL_MS = 10 * 60 * 1000;

// Backs the human-in-the-loop layer for sensitive/write tools called by
// EXTERNAL MCP clients (Claude Desktop, Claude Code, etc). MCP's tools/call
// is a single synchronous RPC with no native two-phase confirmation
// primitive a generic host can be relied on to implement — so instead of
// executing (or, as before this, outright refusing) a sensitive tool call,
// McpController parks it here and the same approval UI pattern the in-app
// chat already uses (AiConversationContext/ai.controller.ts resolve) is
// reused, just reachable from a push notification / dedicated screen
// instead of a chat bubble. The external client polls back via the
// synthetic `check_pending_action` MCP tool (see mcp.controller.ts).
@Injectable()
export class McpPendingActionsService {
  constructor(
    private prisma: PrismaService,
    private executor: ActionExecutorService,
    private notifications: NotificationsService,
  ) {}

  async createPending(userId: string, tool: ToolDefinition, input: any) {
    const summary =
      tool.describeAction?.(input) ?? `${tool.name}(${JSON.stringify(input)})`;
    const action = await this.prisma.pendingMcpAction.create({
      data: {
        userId,
        toolName: tool.name,
        input,
        summary,
        expiresAt: new Date(Date.now() + PENDING_TTL_MS),
      },
    });

    await this.notifications.create(
      userId,
      'mcp_pending_action',
      'Approval needed',
      summary,
      { pendingActionId: action.id },
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.expoPushToken) {
      await sendPushNotification(
        user.expoPushToken,
        'Approval needed',
        summary,
        { type: 'mcp_pending_action', pendingActionId: action.id },
      );
    }

    return action;
  }

  // Lazily flips stale 'pending' rows to 'expired' on read, so a
  // long-since-abandoned request doesn't sit forever presenting as
  // actionable, both in the app list and to a polling MCP client.
  private async expireIfDue(action: PendingMcpAction): Promise<PendingMcpAction> {
    if (action.status === 'pending' && action.expiresAt < new Date()) {
      return this.prisma.pendingMcpAction.update({
        where: { id: action.id },
        data: { status: 'expired', resolvedAt: new Date() },
      });
    }
    return action;
  }

  async listForUser(userId: string) {
    await this.prisma.pendingMcpAction.updateMany({
      where: { userId, status: 'pending', expiresAt: { lt: new Date() } },
      data: { status: 'expired', resolvedAt: new Date() },
    });
    return this.prisma.pendingMcpAction.findMany({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatus(userId: string, id: string) {
    const action = await this.prisma.pendingMcpAction.findFirst({
      where: { id, userId },
    });
    if (!action) return null;
    return this.expireIfDue(action);
  }

  async resolve(userId: string, id: string, approved: boolean) {
    const found = await this.prisma.pendingMcpAction.findFirst({
      where: { id, userId },
    });
    if (!found) throw new NotFoundException('Pending action not found');
    const action = await this.expireIfDue(found);
    if (action.status !== 'pending') {
      throw new BadRequestException(
        `This request is no longer pending (already ${action.status}).`,
      );
    }

    if (!approved) {
      return this.prisma.pendingMcpAction.update({
        where: { id },
        data: { status: 'declined', resolvedAt: new Date() },
      });
    }

    const result = await this.executor.execute(
      userId,
      action.toolName,
      action.input,
      true,
    );
    return this.prisma.pendingMcpAction.update({
      where: { id },
      data: {
        status: 'executed',
        resolvedAt: new Date(),
        result: result.result ?? undefined,
        resultText: result.resultText ?? null,
      },
    });
  }
}
