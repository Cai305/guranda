import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, WorkflowExecution, WorkflowExecutionStatus } from '@prisma/client';

// Real per-workflowKey n8n webhook URL map. Exactly one entry today
// ('telegram.sendMessage', the only tool currently opted into
// executesVia: 'n8n' — see tool-registry.types.ts and
// integrations/telegram-ai-tools.provider.ts). Adding a second provider
// later (WhatsApp, Facebook, ...) is a one-line addition here, not a
// refactor — deliberately not a switch statement or per-provider service.
const WORKFLOW_WEBHOOKS: Record<string, string | undefined> = {
  'telegram.sendMessage': process.env.N8N_TELEGRAM_SEND_WEBHOOK_URL,
};

// Payload keys that must never be persisted in plaintext in
// WorkflowExecution.triggerPayload, even though the real value is still sent
// to n8n over the wire (see trigger() below). Keyed generically rather than
// per-workflow since the same shape (a bot token/access token riding along
// with the rest of a send payload) is the realistic pattern for every future
// n8n-routed integration, not just Telegram.
const SECRET_PAYLOAD_KEYS = new Set([
  'botToken',
  'accessToken',
  'token',
  'apiKey',
  'password',
  'secret',
]);

const DEFAULT_TIMEOUT_MS = 15_000;

export interface TriggerOptions {
  idempotencyKey?: string;
  timeoutMs?: number;
}

// Real Guranda-side gateway to n8n — the hybrid orchestration boundary. A
// tool opted into executesVia: 'n8n' (see ActionExecutorService.runAndRecord)
// calls trigger() here instead of running in-process. This service owns:
// real idempotency (dedupe on a caller-supplied key), a real HTTP call to
// the real n8n webhook with the real gateway auth header, and a real
// WorkflowExecution audit row distinguishing "n8n/gateway unreachable" from
// "the external platform rejected the request" — two different failure
// modes callers need to be able to tell apart from the message text alone.
@Injectable()
export class AutomationGatewayService {
  constructor(private prisma: PrismaService) {}

  private redactPayload(payload: Record<string, any>): Prisma.InputJsonValue {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload || {})) {
      redacted[key] = SECRET_PAYLOAD_KEYS.has(key) ? '[redacted]' : value;
    }
    return redacted as Prisma.InputJsonValue;
  }

  async trigger(
    userId: string,
    workflowKey: string,
    payload: Record<string, any>,
    options: TriggerOptions = {},
  ): Promise<WorkflowExecution> {
    // Real idempotency: a repeat call with the same key returns the existing
    // row as-is instead of creating a new WorkflowExecution or re-hitting
    // n8n a second time. A previously FAILED row does NOT satisfy this — a
    // caller retrying after a real failure should get a real new attempt,
    // not the stale failure replayed forever.
    let existing: WorkflowExecution | null = null;
    if (options.idempotencyKey) {
      existing = await this.prisma.workflowExecution.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });
      if (existing && existing.status !== WorkflowExecutionStatus.FAILED) {
        return existing;
      }
    }

    const webhookUrl = WORKFLOW_WEBHOOKS[workflowKey];
    if (!webhookUrl) {
      throw new BadRequestException(
        `No n8n webhook is configured for workflow "${workflowKey}".`,
      );
    }

    // A retry of a previously-FAILED idempotent call REUSES that same row
    // (reset to RUNNING, clearing the stale error/result) instead of
    // create()-ing a second row — idempotencyKey carries a real DB unique
    // constraint specifically so a genuine duplicate call can never race
    // its way into two rows, so a fresh create() here would always violate
    // it while that row still exists.
    let run: WorkflowExecution = existing
      ? await this.prisma.workflowExecution.update({
          where: { id: existing.id },
          data: {
            status: WorkflowExecutionStatus.RUNNING,
            triggerPayload: this.redactPayload(payload),
            result: Prisma.JsonNull,
            errorMessage: null,
            completedAt: null,
            startedAt: new Date(),
          },
        })
      : await this.prisma.workflowExecution.create({
          data: {
            workflowKey,
            userId,
            triggerPayload: this.redactPayload(payload),
            status: WorkflowExecutionStatus.RUNNING,
            idempotencyKey: options.idempotencyKey ?? null,
          },
        });

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const gatewayKey = process.env.N8N_GATEWAY_KEY;
    const gatewayKeyHeader = process.env.N8N_GATEWAY_KEY_HEADER || 'x-gateway-key';

    let n8nResult: { ok: boolean; result?: any; error?: string } | null = null;
    // Distinct from n8nResult.error (the external platform's own honest
    // rejection, e.g. Telegram's "Bad Request: chat not found") — this is
    // set only when the gateway/n8n itself couldn't be reached at all, so
    // the two failure modes never collapse into the same message.
    let gatewayFailure: string | null = null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(gatewayKey ? { [gatewayKeyHeader]: gatewayKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        gatewayFailure = `The automation gateway (n8n) couldn't be reached properly — it returned HTTP ${res.status}. This is a gateway/workflow problem, not the external platform rejecting the request.`;
      } else {
        const data: any = await res.json().catch(() => null);
        if (!data || typeof data.ok !== 'boolean') {
          gatewayFailure =
            'The automation gateway (n8n) returned an unexpected response shape — the workflow may have been changed or is misconfigured. This is a gateway problem, not the external platform rejecting the request.';
        } else {
          n8nResult = data;
        }
      }
    } catch (e: any) {
      gatewayFailure =
        e?.name === 'AbortError'
          ? `The automation gateway (n8n) didn't respond within ${timeoutMs}ms and the request was aborted. This is a gateway/reachability problem, not the external platform rejecting the request.`
          : `Couldn't reach the automation gateway (n8n): ${e?.message || 'network error'}. This is a gateway/reachability problem, not the external platform rejecting the request.`;
    } finally {
      clearTimeout(timer);
    }

    if (gatewayFailure) {
      return this.prisma.workflowExecution.update({
        where: { id: run.id },
        data: {
          status: WorkflowExecutionStatus.FAILED,
          errorMessage: gatewayFailure,
          completedAt: new Date(),
        },
      });
    }

    if (n8nResult!.ok) {
      return this.prisma.workflowExecution.update({
        where: { id: run.id },
        data: {
          status: WorkflowExecutionStatus.COMPLETED,
          result: (n8nResult!.result ?? null) as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    }

    // n8n was reached fine and normalized the external platform's own
    // rejection into { ok: false, error } — an honest business-level
    // failure, distinct from gatewayFailure above.
    return this.prisma.workflowExecution.update({
      where: { id: run.id },
      data: {
        status: WorkflowExecutionStatus.FAILED,
        errorMessage: n8nResult!.error || 'The external platform rejected the request.',
        completedAt: new Date(),
      },
    });
  }

  async getExecution(userId: string, id: string): Promise<WorkflowExecution> {
    const run = await this.prisma.workflowExecution.findUnique({ where: { id } });
    if (!run) throw new NotFoundException(`WorkflowExecution "${id}" not found`);
    if (run.userId !== userId) {
      throw new ForbiddenException('You can only view your own workflow executions');
    }
    return run;
  }

  async listExecutions(userId: string, workflowKey?: string): Promise<WorkflowExecution[]> {
    return this.prisma.workflowExecution.findMany({
      where: { userId, ...(workflowKey ? { workflowKey } : {}) },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Best-effort ONLY. n8n's webhook-triggered execution (see trigger() above)
   * runs as one synchronous HTTP round-trip from this service's point of
   * view — there is no n8n execution-cancel API wired up here, so this
   * cannot actually interrupt an in-flight n8n/Telegram call. All this does
   * is mark the Guranda-side WorkflowExecution row FAILED with an honest
   * "cancelled by user" message. If trigger()'s HTTP call for this same row
   * is still in flight elsewhere (a genuine race — e.g. this is called from
   * a second request while the first is still awaiting n8n), that call
   * still runs to completion inside n8n and will overwrite this row's
   * status when it resolves; this method does not and cannot prevent that.
   * Do not present this to a user as "the send was stopped."
   */
  async cancel(userId: string, id: string): Promise<WorkflowExecution> {
    const run = await this.getExecution(userId, id);
    if (
      run.status === WorkflowExecutionStatus.COMPLETED ||
      run.status === WorkflowExecutionStatus.FAILED
    ) {
      // Already resolved — nothing to cancel. Return as-is rather than
      // pretending to cancel a call that already finished.
      return run;
    }
    return this.prisma.workflowExecution.update({
      where: { id: run.id },
      data: {
        status: WorkflowExecutionStatus.FAILED,
        errorMessage:
          'Cancelled by user. Note: this only marks the Guranda-side record as failed — n8n has no execution-cancel API wired up here, so an in-flight call to the external platform is not actually interrupted by this action.',
        completedAt: new Date(),
      },
    });
  }
}
