import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ActionExecutorService } from '../ai-runtime/action-executor.service';
import { Blueprint, BlueprintRunStatus, BlueprintStatus, FeaturePricingType, Prisma } from '@prisma/client';

interface BlueprintStep {
  actionName: string;
  inputTemplate: Record<string, unknown>;
}

interface StepResult {
  actionName: string;
  status: 'SUCCESS' | 'FAILED';
  output?: unknown;
  error?: string;
}

/** Internal result of running one step's real action call, before either persisted-run's StepResult framing or runSteps' TestRunStepResult framing is applied on top. */
interface StepExecutionOutcome {
  status: 'SUCCESS' | 'FAILED';
  output?: unknown;
  error?: string;
}

/** One entry of runSteps()'s step-by-step result array — the Feature Workshop's "Step 1... Step 2..." inspector shape (Phase 3). Lowercase status, distinct from StepResult's uppercase, since this is a different public contract (features/dto's FeatureTestRunStepDto), not the persisted BlueprintRun.stepResults shape. */
export interface TestRunStepResult {
  actionName: string;
  status: 'success' | 'failed';
  output?: unknown;
  error?: string;
  durationMs: number;
}

// Phase 2: real execution of a Blueprint's saved steps. Deliberately the
// most boring code in this initiative — see the module doc comment on
// runBlueprint() below for why. Never calls an LLM, never reorders/skips
// steps, never "decides" anything: it substitutes {{variable}} placeholders
// into the already-authored steps[] and calls the SAME ActionExecutorService
// every other real action call (AI-driven or not) goes through, so
// permission checks / audit logging / retry behave identically here.
@Injectable()
export class BlueprintExecutionService {
  constructor(
    private prisma: PrismaService,
    private actionExecutor: ActionExecutorService,
  ) {}

  /**
   * Deterministically runs one BlueprintVersion's steps in order, with
   * {{variable}} placeholders in each step's inputTemplate substituted from
   * `variables`. This is the "run my Cape Town Blueprint, but for Durban"
   * capability — the AI is NOT involved anywhere in this method: the step
   * sequence was authored once (Phase 3, not this method's concern) and is
   * replayed exactly, only the variables changing. If you find yourself
   * wanting to add branching, reordering, or "ask the AI what to do next"
   * logic here, that's out of scope for this method — see the class doc
   * comment.
   */
  async runBlueprint(
    userId: string,
    blueprintVersionId: string,
    variables: Record<string, string | number>,
  ) {
    const version = await this.prisma.blueprintVersion.findUnique({
      where: { id: blueprintVersionId },
      include: { blueprint: true },
    });
    if (!version) {
      throw new NotFoundException(
        `BlueprintVersion "${blueprintVersionId}" not found`,
      );
    }
    // Phase 4 Marketplace — additive gate only: the creator could always
    // run their own Blueprint and still can, unconditionally, below. This
    // only narrows who ELSE may run it (previously anyone with a valid
    // versionId could, regardless of ownership, status, or price — a real
    // gap now that purchases exist).
    await this.assertCanRun(userId, version.blueprint);
    const steps = (version.steps as unknown as BlueprintStep[]) ?? [];
    if (steps.length === 0) {
      throw new BadRequestException(
        `BlueprintVersion "${blueprintVersionId}" has no steps to run`,
      );
    }

    let run = await this.prisma.blueprintRun.create({
      data: {
        blueprintId: version.blueprintId,
        versionId: version.id,
        userId,
        variables: variables as Prisma.InputJsonValue,
        status: BlueprintRunStatus.PENDING,
        stepResults: [] as unknown as Prisma.InputJsonValue,
      },
    });

    run = await this.prisma.blueprintRun.update({
      where: { id: run.id },
      data: { status: BlueprintRunStatus.RUNNING },
    });

    const stepResults: StepResult[] = [];

    for (const step of steps) {
      const outcome = await this.executeOneStep(userId, step, variables);

      if (outcome.status === 'FAILED') {
        return this.failRun(run.id, stepResults, {
          actionName: step.actionName,
          status: 'FAILED',
          error: outcome.error,
        });
      }

      stepResults.push({
        actionName: step.actionName,
        status: 'SUCCESS',
        output: outcome.output,
      });
      run = await this.prisma.blueprintRun.update({
        where: { id: run.id },
        data: { stepResults: stepResults as unknown as Prisma.InputJsonValue },
      });
    }

    return this.prisma.blueprintRun.update({
      where: { id: run.id },
      data: {
        status: BlueprintRunStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Runs an arbitrary ordered list of {actionName, inputTemplate} steps
   * through the exact same real per-step execution logic runBlueprint uses
   * (see executeOneStep below) WITHOUT requiring a persisted
   * BlueprintVersion row first — this is what lets the Feature Workshop
   * (Phase 3) test-run a Feature draft's action sequence before it has
   * ever been saved. Real execution against the real ActionExecutorService
   * — same permission/audit-log path as everything else — "sandbox" here
   * means "not yet published", never "faked". Stops at the first failure,
   * same semantics as runBlueprint, so the step-by-step result array shows
   * exactly how far a draft got before something broke.
   *
   * options.persist is accepted for API symmetry with the class's other
   * public method but not implemented: no caller today has a real
   * Blueprint/BlueprintVersion to attach a BlueprintRun row to (a Feature
   * draft under test in the Workshop is by definition unsaved) — use
   * runBlueprint for the already-verified persisted-run path instead.
   */
  async runSteps(
    userId: string,
    steps: BlueprintStep[],
    variables: Record<string, string | number> = {},
    options: { persist: boolean } = { persist: false },
  ): Promise<{ steps: TestRunStepResult[]; overallStatus: 'success' | 'failed' }> {
    if (options.persist) {
      throw new BadRequestException(
        'runSteps(persist: true) is not supported — there is no Blueprint/BlueprintVersion to attach a run to. Use runBlueprint for a saved Blueprint.',
      );
    }
    if (steps.length === 0) {
      throw new BadRequestException('No steps to run');
    }

    const results: TestRunStepResult[] = [];
    let overallStatus: 'success' | 'failed' = 'success';

    for (const step of steps) {
      const start = Date.now();
      const outcome = await this.executeOneStep(userId, step, variables);
      const durationMs = Date.now() - start;

      results.push({
        actionName: step.actionName,
        status: outcome.status === 'SUCCESS' ? 'success' : 'failed',
        output: outcome.output,
        error: outcome.error,
        durationMs,
      });

      if (outcome.status === 'FAILED') {
        overallStatus = 'failed';
        break; // stop at the first real failure — same semantics as runBlueprint
      }
    }

    return { steps: results, overallStatus };
  }

  /**
   * The ONE real step-execution loop body — resolve {{variable}}
   * placeholders, call the real ActionExecutorService, and classify the
   * result. Both runBlueprint (persisted) and runSteps (unpersisted
   * Workshop test-run) call this so there is never a second, drifting copy
   * of this classification logic.
   */
  private async executeOneStep(
    userId: string,
    step: BlueprintStep,
    variables: Record<string, string | number>,
  ): Promise<StepExecutionOutcome> {
    let resolvedInput: Record<string, unknown>;
    try {
      resolvedInput = this.resolveInputTemplate(
        step.inputTemplate ?? {},
        variables,
      );
    } catch (e: any) {
      return { status: 'FAILED', error: e.message };
    }

    let execResult;
    try {
      // approved=true: running a Blueprint (or a Workshop test-run of an
      // already-authored step sequence) IS the user's explicit approval —
      // the per-call sensitive-action confirmation gate exists for the AI
      // freelancing a NEW action mid-conversation, which is not what's
      // happening here. Permission/capability-grant checks below still
      // apply exactly as normal — approved only bypasses the extra
      // "confirm this one call" prompt, not the AiAgent.permissions gate.
      execResult = await this.actionExecutor.execute(
        userId,
        step.actionName,
        resolvedInput,
        true,
      );
    } catch (e: any) {
      return {
        status: 'FAILED',
        error: e?.message || 'Action executor threw unexpectedly',
      };
    }

    if (execResult.status === 'denied' || execResult.status === 'pending') {
      return {
        status: 'FAILED',
        error:
          execResult.resultText ||
          `Step "${step.actionName}" could not run (executor status: ${execResult.status})`,
      };
    }

    if (execResult.status === 'started') {
      // backgroundCapable tools run async and don't have a result yet;
      // this phase is synchronous-only by design, so a step referencing
      // one is a real, honest failure — not something to silently mark as
      // succeeded.
      return {
        status: 'FAILED',
        error: `Step "${step.actionName}" is a background-capable action, which synchronous execution doesn't support yet.`,
      };
    }

    // status === 'executed'. `success` distinguishes a real handler
    // failure from a genuine result — status alone stays 'executed' even
    // when the tool threw (see ActionExecutorService.execute doc comment).
    if (execResult.success === false) {
      return {
        status: 'FAILED',
        error: execResult.resultText || `Step "${step.actionName}" failed`,
      };
    }

    return { status: 'SUCCESS', output: execResult.result };
  }

  private async failRun(
    runId: string,
    priorResults: StepResult[],
    failedStep: StepResult,
  ) {
    const stepResults = [...priorResults, failedStep];
    return this.prisma.blueprintRun.update({
      where: { id: runId },
      data: {
        status: BlueprintRunStatus.FAILED,
        stepResults: stepResults as unknown as Prisma.InputJsonValue,
        errorMessage: failedStep.error,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Substitutes every "{{name}}" placeholder found anywhere in `template`
   * (recursing into nested objects/arrays) against `variables`. A value
   * that is *exactly* "{{name}}" (nothing else in the string) resolves to
   * the variable's real type (number stays a number); a placeholder
   * embedded in a larger string is stringified in place. Throws
   * BadRequestException naming every unresolved placeholder — never
   * silently substitutes an empty string or drops the key.
   */
  private resolveInputTemplate(
    template: Record<string, unknown>,
    variables: Record<string, string | number>,
  ): Record<string, unknown> {
    const missing = new Set<string>();
    const placeholderRe = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

    const resolveValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        const fullMatch = value.match(
          new RegExp(`^${placeholderRe.source}$`),
        );
        if (fullMatch) {
          const key = fullMatch[1];
          if (!Object.prototype.hasOwnProperty.call(variables, key)) {
            missing.add(key);
            return value;
          }
          return variables[key];
        }
        return value.replace(placeholderRe, (whole, key) => {
          if (!Object.prototype.hasOwnProperty.call(variables, key)) {
            missing.add(key);
            return whole;
          }
          return String(variables[key]);
        });
      }
      if (Array.isArray(value)) return value.map(resolveValue);
      if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          out[k] = resolveValue(v);
        }
        return out;
      }
      return value;
    };

    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      resolved[key] = resolveValue(value);
    }

    if (missing.size > 0) {
      throw new BadRequestException(
        `Blueprint run is missing required variable(s): ${Array.from(missing)
          .sort()
          .join(', ')}`,
      );
    }
    return resolved;
  }

  async getRun(userId: string, runId: string) {
    const run = await this.prisma.blueprintRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new NotFoundException(`BlueprintRun "${runId}" not found`);
    if (run.userId !== userId) {
      throw new ForbiddenException('You can only view your own Blueprint runs');
    }
    return run;
  }

  async listRuns(userId: string, blueprintId?: string) {
    return this.prisma.blueprintRun.findMany({
      where: { userId, ...(blueprintId ? { blueprintId } : {}) },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Phase 4 Marketplace authorization gate for runBlueprint. The creator
   * may always run their own Blueprint, in any status — this is checked
   * FIRST and returns immediately, so the already-verified owner-execution
   * path from Phase 2 is completely untouched. Anyone else may only run a
   * PUBLISHED Blueprint, and only if it's FREE or they hold a real,
   * unrefunded BlueprintPurchase (see BlueprintMarketplaceService.purchase).
   */
  private async assertCanRun(userId: string, blueprint: Blueprint) {
    if (blueprint.createdByUserId === userId) return;

    if (blueprint.status !== BlueprintStatus.PUBLISHED) {
      throw new ForbiddenException('This Blueprint is not published');
    }
    if (blueprint.pricingType === FeaturePricingType.FREE) return;

    const purchased = await this.prisma.blueprintPurchase.findFirst({
      where: { blueprintId: blueprint.id, buyerUserId: userId, refundedAt: null },
    });
    if (!purchased) {
      throw new ForbiddenException('Purchase this Blueprint before running it');
    }
  }
}
