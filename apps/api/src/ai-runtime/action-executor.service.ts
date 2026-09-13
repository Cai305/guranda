import { Injectable, HttpException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { ToolDefinition } from '../tool-registry/tool-registry.types';
import { ContextManagerService } from './context-manager.service';
import { CapabilityGrantService } from '../capabilities/capability-grant.service';
import { AutomationGatewayService } from '../automation-gateway/automation-gateway.service';
import { WorkflowExecutionStatus } from '@prisma/client';

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
  /**
   * Set when status === 'executed'. True iff the tool handler actually
   * completed without throwing — distinct from status itself, which stays
   * 'executed' even when the handler failed (that's the LLM-facing
   * contract: a friendly "Failed: ..." resultText flows back into the
   * conversation instead of an exception). Callers that need a real
   * pass/fail signal (e.g. BlueprintExecutionService, which must stop a
   * deterministic run on a genuine failure) should check this instead of
   * `status`.
   */
  success?: boolean;
  /** ToolExecutionLog row id written for this call, when one was written (status 'executed'). */
  logId?: string;
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
    private automationGateway: AutomationGatewayService,
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

    const { output, resultText, success, logId } = await this.runAndRecord(
      userId,
      tool,
      input,
    );
    await this.contextManager.touch(userId, {
      activeModule: tool.module,
      taskSummary: tool.describeAction?.(input) ?? tool.name,
    });
    return { status: 'executed', result: output, resultText, success, logId };
  }

  async getExecution(userId: string, executionId: string) {
    return this.prisma.toolExecutionLog.findFirst({
      where: { id: executionId, userId },
    });
  }

  /**
   * The n8n branch of runAndRecord's execution step (see tool.executesVia
   * docs in tool-registry.types.ts). Never calls tool.handler at all —
   * routes through AutomationGatewayService.trigger() instead, then maps
   * the resulting WorkflowExecution back into the exact same
   * resolve-with-output / throw-to-fail contract tool.handler itself would
   * produce, so the surrounding try/catch in runAndRecord (and therefore
   * the ToolExecutionLog write, retry logic, and ExecuteResult shape) is
   * completely unaware whether it just ran a native handler or an n8n
   * round-trip.
   */
  private async runViaGateway(userId: string, tool: ToolDefinition, input: any): Promise<any> {
    // Idempotency is derived from the AI/Blueprint-facing `input`, not the
    // built gateway payload — deliberately: (a) the built payload can carry
    // a real secret (see buildGatewayPayload doc comment) that shouldn't be
    // hashed/compared for this, and (b) "the same logical tool call" is
    // defined by userId+tool+input regardless of what secret happens to be
    // attached to fulfill it.
    const idempotencyKey = this.deriveIdempotencyKey(userId, tool.name, input);
    const payload = tool.buildGatewayPayload
      ? await tool.buildGatewayPayload({ userId }, input)
      : input;
    const run = await this.automationGateway.trigger(userId, tool.name, payload, {
      idempotencyKey,
    });
    if (run.status === WorkflowExecutionStatus.FAILED) {
      const message = run.errorMessage || `${tool.name} failed via the automation gateway.`;
      // Mirrors isRetryable()'s native-tool convention (a 4xx HttpException
      // is a correct rejection, not worth retrying; anything else gets one
      // retry): AutomationGatewayService prefixes its own gateway/n8n
      // reachability failures with a recognizable phrase, distinct from an
      // external platform's own honest rejection text (e.g. Telegram's
      // "Bad Request: chat not found") passed through verbatim. A
      // reachability failure is plausibly transient (our side of the wire)
      // so it gets one retry (502); a real rejection from the external
      // platform won't change on retry (400).
      const isGatewayReachabilityFailure =
        message.startsWith('The automation gateway (n8n)') ||
        message.startsWith("Couldn't reach the automation gateway (n8n)");
      throw new HttpException(message, isGatewayReachabilityFailure ? 502 : 400);
    }
    return run.result;
  }

  /**
   * Real (not fake-to-check-a-box) idempotency key derivation for the n8n
   * gateway path: a stable hash of userId+toolName+input, bucketed into a
   * short (5-minute) time window. Two calls with identical input from the
   * same user for the same tool within the same window collapse to the
   * same WorkflowExecution row (see AutomationGatewayService.trigger) — the
   * realistic case this guards is an LLM or a flaky client re-issuing the
   * "same" tool call (e.g. after callWithRetry's own retry, or a duplicated
   * request), not a general cross-session dedupe.
   */
  private deriveIdempotencyKey(userId: string, toolName: string, input: any): string {
    const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const raw = `${userId}:${toolName}:${JSON.stringify(input)}:${bucket}`;
    return createHash('sha256').update(raw).digest('hex');
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
  ): Promise<{ output: any; resultText: string; logId: string; success: boolean }> {
    const start = Date.now();
    try {
      const output = await this.callWithRetry(() =>
        tool.executesVia === 'n8n'
          ? this.runViaGateway(userId, tool, input)
          : tool.handler({ userId }, input),
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
      return { output, resultText, logId: log.id, success: true };
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
      return {
        output: null,
        resultText: `Failed: ${message}`,
        logId: log.id,
        success: false,
      };
    }
  }
}
