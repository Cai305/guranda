import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { WidgetRegistryService } from '../widget-registry/widget-registry.service';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';
import { BlueprintExecutionService, TestRunStepResult } from '../blueprints/blueprint-execution.service';
import { FeaturesService } from './features.service';
import { SaveFeatureDraftDto } from './dto/save-feature-draft.dto';
import { FeatureTestRunDto } from './dto/feature-test-run.dto';

// Real system prompt for the Feature Builder (Phase 3). Follows the exact
// pattern proven by home.service.ts's BRIEFING_SYSTEM_PROMPT: the model is
// handed one JSON object that is its ONLY source of truth, told explicitly
// never to invent beyond it, and told to be honest about gaps rather than
// guess. Here the "only source of truth" is the live tool/widget catalog —
// the model must never propose an action or widget name that isn't
// verbatim in that catalog.
const FEATURE_BUILDER_SYSTEM_PROMPT = `You are the Feature Builder for Guranda, a South African super-app. Given a user's natural-language request and the REAL, complete list of actions and widgets that exist in the app today, you compose an ordered plan for a new "Feature" — a saved, reusable bundle of one or more of those actions plus the widget(s) that render their results.

You are given one JSON object with two keys:
- "request": the user's own words describing what they want Guranda to do.
- "catalog": { "actions": [...], "widgets": [...] } — the REAL, complete, live list of every action and widget that exists in Guranda right now. This catalog is your ONLY source of truth for what is possible. Each action has a "name" (dot-namespaced, e.g. "ride.request"), a "description", an "inputSchema", and a "renderAs" (the widget id its result can render as, if any).

Hard rules:
- You may ONLY reference action "name" values and widget "id" values that appear verbatim in "catalog". Never invent a plausible-sounding action or widget name, even when the request obviously calls for one that doesn't exist — a hallucinated name is worse than an honest "I can't do that yet".
- If the request needs a capability that has no matching action in the catalog (e.g. it names an external platform, or a feature Guranda genuinely doesn't have), say so plainly in "unachievableNotes" in plain English instead of guessing at a name. It's fine for a Feature to be partially achievable — describe what part you could build and what part you couldn't.
- List actionNames in the exact order they should run to fulfill the request (a single action is fine for a simple request; do not chain unrelated actions just to pad the plan).
- Only include a widget id in "widgetIds" when a selected action's own "renderAs" in the catalog names it — never invent a rendering that no selected action actually produces.
- Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after it, matching exactly this shape:
{
  "name": "short Feature name, <= 60 characters",
  "description": "one or two sentence description of what this Feature does, written for the end user",
  "category": "a short lowercase category tag, e.g. \\"travel\\", \\"wallet\\", \\"food\\"",
  "icon": "one Ionicons icon name that fits, e.g. \\"car-outline\\"",
  "actionNames": ["exact.action.name", "..."],
  "widgetIds": ["exact-widget-id", "..."],
  "unachievableNotes": ["plain-English note about anything requested that isn't possible with today's catalog — an empty array when the whole request is achievable"]
}`;

export interface FeatureDraftAction {
  actionName: string;
  description: string;
  permissionKey: string;
  sensitive: boolean;
  renderAs?: string | null;
  inputSchema: Record<string, unknown>;
}

export interface FeatureDraft {
  name: string;
  description: string;
  category: string;
  icon: string;
  actions: FeatureDraftAction[];
  widgetIds: string[];
  permissionsRequired: string[];
  unachievableNotes: string[];
}

interface RawModelPlan {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  icon?: unknown;
  actionNames?: unknown;
  widgetIds?: unknown;
  unachievableNotes?: unknown;
}

// Phase 3: AI-driven generation of a Feature draft (never auto-published —
// see saveDraftAsFeature, the explicit human "review and save" step) plus
// the Feature Workshop's real sandbox test runner. Every action/widget name
// the model proposes is re-validated against the live ToolRegistryService/
// WidgetRegistryService here — a defense-in-depth pre-check with better UX
// than the 400 FeaturesService.createVersion already throws for the same
// reason, not a replacement for it.
@Injectable()
export class FeatureBuilderService {
  private readonly logger = new Logger(FeatureBuilderService.name);

  constructor(
    private toolRegistry: ToolRegistryService,
    private widgetRegistry: WidgetRegistryService,
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
    private features: FeaturesService,
    private blueprintExecution: BlueprintExecutionService,
  ) {}

  async generateFeatureDraft(userId: string, description: string): Promise<FeatureDraft> {
    if (!description?.trim()) {
      throw new BadRequestException('description is required');
    }

    // Always introspect live — never a hardcoded subset (task directive).
    const tools = this.toolRegistry.listTools();
    const widgets = this.widgetRegistry.listWidgets();

    const catalog = {
      actions: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        permissionKey: t.permissionKey,
        sensitive: t.sensitive,
        module: t.module,
        renderAs: t.renderAs ?? null,
      })),
      widgets: widgets.map((w) => ({
        id: w.id,
        description: w.description,
        inputSchema: w.inputSchema,
      })),
    };

    const userMessage = JSON.stringify({ request: description, catalog });

    let rawText: string;
    try {
      const result = await this.llm.runTurn({
        system: FEATURE_BUILDER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        tools: [],
      });
      rawText = result.content.trim();
      if (!rawText) throw new Error('Empty response from the model');
    } catch (e: any) {
      this.logger.warn(`Feature draft generation failed for ${userId}: ${e.message}`);
      throw new BadRequestException(
        `Could not generate a Feature draft right now (${e.message || 'model call failed'}). Try again in a moment.`,
      );
    }

    const plan = this.parseModelPlan(rawText);
    return this.buildValidatedDraft(plan);
  }

  /** Strips optional ```json fences a model sometimes adds despite being told not to, then parses. Throws a real, honest error rather than silently returning a fake plan when the model's output isn't valid JSON. */
  private parseModelPlan(rawText: string): RawModelPlan {
    let candidate = rawText.trim();
    const fenced = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) candidate = fenced[1].trim();

    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Model response was not a JSON object');
      }
      return parsed as RawModelPlan;
    } catch (e: any) {
      this.logger.warn(`Feature Builder model returned non-JSON output: ${rawText.slice(0, 500)}`);
      throw new BadRequestException(
        'The AI response could not be understood as a Feature plan. Try rephrasing the request.',
      );
    }
  }

  private buildValidatedDraft(plan: RawModelPlan): FeatureDraft {
    const requestedActionNames = Array.isArray(plan.actionNames)
      ? plan.actionNames.filter((n): n is string => typeof n === 'string')
      : [];
    const requestedWidgetIds = Array.isArray(plan.widgetIds)
      ? plan.widgetIds.filter((n): n is string => typeof n === 'string')
      : [];
    const modelNotes = Array.isArray(plan.unachievableNotes)
      ? plan.unachievableNotes.filter((n): n is string => typeof n === 'string')
      : [];

    const notes: string[] = [...modelNotes];
    const actions: FeatureDraftAction[] = [];

    for (const name of requestedActionNames) {
      if (!this.toolRegistry.hasTool(name)) {
        // The model hallucinated a name anyway despite the hard rule —
        // drop it and say so honestly rather than crashing or silently
        // accepting a bad reference.
        notes.push(`The AI referenced an action ("${name}") that doesn't exist in the current catalog — it was dropped from this draft.`);
        continue;
      }
      const tool = this.toolRegistry.getTool(name);
      actions.push({
        actionName: tool.name,
        description: tool.description,
        permissionKey: tool.permissionKey,
        sensitive: tool.sensitive,
        renderAs: tool.renderAs ?? null,
        inputSchema: tool.inputSchema,
      });
    }

    const widgetIds: string[] = [];
    for (const id of requestedWidgetIds) {
      if (!this.widgetRegistry.hasWidget(id)) {
        notes.push(`The AI referenced a widget ("${id}") that doesn't exist in the current catalog — it was dropped from this draft.`);
        continue;
      }
      widgetIds.push(id);
    }

    // permissionsRequired is derived server-side from the VALIDATED actions'
    // real permissionKey values — never taken from the model directly.
    const permissionsRequired = Array.from(new Set(actions.map((a) => a.permissionKey)));

    return {
      name: typeof plan.name === 'string' && plan.name.trim() ? plan.name.trim().slice(0, 100) : 'Untitled Feature',
      description:
        typeof plan.description === 'string' && plan.description.trim()
          ? plan.description.trim().slice(0, 2000)
          : 'No description generated.',
      category: typeof plan.category === 'string' && plan.category.trim() ? plan.category.trim().slice(0, 50) : 'general',
      icon: typeof plan.icon === 'string' && plan.icon.trim() ? plan.icon.trim().slice(0, 50) : 'sparkles-outline',
      actions,
      widgetIds,
      permissionsRequired,
      unachievableNotes: notes,
    };
  }

  /** The explicit human "review, possibly edit, then save" step — a generated draft never becomes a real Feature on its own. Reuses FeaturesService's own Phase 1 create/createVersion path (and its validation) rather than duplicating it. */
  async saveDraftAsFeature(userId: string, dto: SaveFeatureDraftDto) {
    const feature = await this.features.create(userId, {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      icon: dto.icon,
      gradientColors: dto.gradientColors,
    });

    await this.features.createVersion(userId, feature.id, {
      versionLabel: 'v1',
      actionNames: dto.actionNames,
      widgetIds: dto.widgetIds ?? [],
      permissionsRequired: dto.permissionsRequired ?? [],
      changelog: 'Generated via the AI Feature Builder',
    });

    // Refetch so the response carries the now-set currentVersion — a richer,
    // accurate confirmation for the mobile "Saved as Draft" flow.
    return this.features.getById(feature.id);
  }

  /** Feature Workshop's real sandbox test runner — see BlueprintExecutionService.runSteps' doc comment for why this is real execution, not a fake mode. */
  async testRun(userId: string, dto: FeatureTestRunDto): Promise<{ steps: TestRunStepResult[]; overallStatus: 'success' | 'failed' }> {
    if (!dto.actionNames || dto.actionNames.length === 0) {
      throw new BadRequestException('actionNames must include at least one action to test');
    }
    const invalid = dto.actionNames.filter((name) => !this.toolRegistry.hasTool(name));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown tool-registry action name(s): ${invalid.join(', ')}`);
    }

    const steps = dto.actionNames.map((actionName, i) => ({
      actionName,
      inputTemplate: dto.testInput?.[i] ?? {},
    }));

    return this.blueprintExecution.runSteps(userId, steps, dto.variables ?? {}, { persist: false });
  }
}
