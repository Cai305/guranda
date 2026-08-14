import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { ToolDefinition } from '../tool-registry/tool-registry.types';
import { ContextManagerService } from './context-manager.service';
import { CapabilityGrantService } from '../capabilities/capability-grant.service';

export interface PendingAction {
  toolName: string;
  input: any;
  summary: string;
}

export interface ExecuteResult {
  status: 'denied' | 'pending' | 'executed' | 'started';
  pendingAction?: PendingAction;
  result?: any;
  /** LLM-facing text — what gets fed back into the conversation as a tool_result. */
  resultText?: string;
  /** Set when status === 'started' (backgroundCapable tool) — poll GET /ai/executions/:id. */
  executionId?: string;
}

// The single place every tool call flows through: permission check → sensitive
// confirmation gate → execute (with a bounded retry + audit log) → context
// touch. Generalizes the old ai.service.ts's hardcoded isActionTool() allowlist
// and inline executeRead/executeAction switch statements to ANY registered tool.
@Injectable()
export class ActionExecutorService {
  constructor(
    private prisma: PrismaService,
    private registry: ToolRegistryService,
    private contextManager: ContextManagerService,
    private capabilityGrants: CapabilityGrantService,
  ) {}

  async execute(
    userId: string,
    toolName: string,
    input: any,
    approved = false,
  ): Promise<ExecuteResult> {
    const tool = this.registry.getTool(toolName);

    const agent = await this.prisma.aiAgent.findUnique({ where: { userId } });
    const perms = (agent?.permissions || {}) as Record<string, boolean>;
    const granted =
      perms[tool.permissionKey] || tool.legacyAliases?.some((a) => perms[a]);
    if (!granted) {
      return {
        status: 'denied',
        resultText: `The user hasn't granted the "${tool.permissionKey}" permission needed for this action. Suggest they enable it in AI settings.`,
      };
    }

    // Distinct from the AiAgent.permissions check above — that's "has the
    // user's own AI companion been allowed to call this at all", this is
    // "has the user granted this specific third-party/paid capability" (see
    // ToolDefinition.requiresCapabilityGrant's doc comment). No built-in
    // tool sets this flag today, so this is a no-op for every existing tool.
    if (tool.requiresCapabilityGrant && !(await this.capabilityGrants.check(userId, tool.module))) {
      return {
        status: 'denied',
        resultText: `The "${tool.module}" capability hasn't been granted by the user.`,
      };
    }

    if (tool.sensitive && !approved) {
      return {
        status: 'pending',
        pendingAction: {
          toolName: tool.name,
          input,
          summary:
            tool.describeAction?.(input) ??
            `${tool.name}(${JSON.stringify(input)})`,
        },
      };
    }

    if (tool.backgroundCapable) {
      const log = await this.prisma.toolExecutionLog.create({
        data: { userId, toolName: tool.name, input, status: 'PENDING' },
      });
      // Fire-and-forget: not awaited, so the caller (HTTP request) returns immediately.
      void this.runAndRecord(userId, tool, input, log.id);
      return { status: 'started', executionId: log.id };
    }

    const { output, resultText } = await this.runAndRecord(
      userId,
      tool,
      input,
    );
    await this.contextManager.touch(userId, {
      activeModule: tool.module,
      taskSummary: tool.describeAction?.(input) ?? tool.name,
    });
    return { status: 'executed', result: output, resultText };
  }

  async getExecution(userId: string, executionId: string) {
    return this.prisma.toolExecutionLog.findFirst({
      where: { id: executionId, userId },
    });
  }

  private isRetryable(e: any): boolean {
    // A 4xx HttpException is the tool correctly rejecting bad input/business
    // rules (insufficient balance, not verified, etc.) — retrying won't help.
    // Anything else (network blips, unexpected 5xx) gets one retry.
    if (e instanceof HttpException) return e.getStatus() >= 500;
    return true;
  }

  private async callWithRetry(
    handler: () => Promise<any>,
    maxAttempts = 2,
  ): Promise<any> {
    let lastError: any;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await handler();
      } catch (e) {
        lastError = e;
        if (attempt === maxAttempts - 1 || !this.isRetryable(e)) throw e;
      }
    }
    throw lastError;
  }

  private async runAndRecord(
    userId: string,
    tool: ToolDefinition,
    input: any,
    existingLogId?: string,
  ): Promise<{ output: any; resultText: string; logId: string }> {
    const start = Date.now();
    try {
      const output = await this.callWithRetry(() =>
        tool.handler({ userId }, input),
      );
      const durationMs = Date.now() - start;
      const resultText =
        tool.describeResult?.(input, output) ?? JSON.stringify(output);
      const log = existingLogId
        ? await this.prisma.toolExecutionLog.update({
            where: { id: existingLogId },
            data: { output, status: 'SUCCESS', durationMs },
          })
        : await this.prisma.toolExecutionLog.create({
            data: {
              userId,
              toolName: tool.name,
              input,
              output,
              status: 'SUCCESS',
              durationMs,
            },
          });
      return { output, resultText, logId: log.id };
    } catch (e: any) {
      const durationMs = Date.now() - start;
      const message = e?.message || 'Action failed';
      const log = existingLogId
        ? await this.prisma.toolExecutionLog.update({
            where: { id: existingLogId },
            data: { status: 'FAILED', error: message, durationMs },
          })
        : await this.prisma.toolExecutionLog.create({
            data: {
              userId,
              toolName: tool.name,
              input,
              status: 'FAILED',
              error: message,
              durationMs,
            },
          });
      return { output: null, resultText: `Failed: ${message}`, logId: log.id };
    }
  }
}
