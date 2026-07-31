import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import {
  ActionExecutorService,
  PendingAction,
} from './action-executor.service';
import { ContextManagerService } from './context-manager.service';
import { ConversationHistoryService } from './conversation-history.service';
import { LLM_ADAPTER } from './llm-adapter.token';
import type { LlmAdapter } from './llm-adapter.interface';
import { RuntimeMessage, RuntimeTool } from './llm-adapter.interface';
import { MINI_APPS_CATALOG } from '../store/mini-apps-catalog';

const MAX_LOOPS = 14;

/** A tool result the client should render as a visual widget (e.g. a row of
 * shopping product cards) instead of only reading it as plain text — see
 * ToolDefinition.renderAs in tool-registry.types.ts for how a tool opts in. */
export interface ToolWidget {
  toolCallId: string;
  toolName: string;
  renderAs: string;
  data: any;
}

export interface RunResult {
  reply: string;
  conversation: RuntimeMessage[];
  pendingAction: (PendingAction & { toolUseId: string }) | null;
  /** Set when a backgroundCapable tool just started — poll GET /ai/executions/:id with this to find out when it finishes. */
  backgroundExecutionId?: string;
  /** Structured results from any tool calls this turn whose tool is tagged renderAs. */
  widgets: ToolWidget[];
}

// Generalizes the old ai.service.ts's runLoop(): resolves tools from the
// registry (filtered by the caller's granted permissions) instead of a
// hardcoded buildTools() switch, and routes every tool call through
// ActionExecutorService instead of inline executeRead/executeAction.
@Injectable()
export class AgentRuntimeService {
  constructor(
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
    private prisma: PrismaService,
    private registry: ToolRegistryService,
    private executor: ActionExecutorService,
    private contextManager: ContextManagerService,
    private conversationHistory: ConversationHistoryService,
  ) {}

  async runLoop(
    userId: string,
    messages: RuntimeMessage[],
  ): Promise<RunResult> {
    const agent = await this.prisma.aiAgent.findUnique({ where: { userId } });
    if (!agent) throw new BadRequestException('AI agent not set up yet');
    const perms = (agent.permissions || {}) as Record<string, boolean>;
    const grantedKeys = Object.entries(perms)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const availableTools = this.registry.listTools({
      permissionKeys: grantedKeys,
    });
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const session = await this.contextManager.get(userId);
    const recentHistory =
      await this.conversationHistory.getRecentSummary(userId);
    // Read access defaults open like every other pure-read capability
    // (wallet.read, travel.read, etc.) — only explicit `false` turns it off.
    const internetAccessGranted = perms['internet.search'] !== false;

    const system = this.buildSystemPrompt(
      agent,
      profile?.displayName || 'there',
      availableTools,
      session,
      recentHistory,
    );
    const runtimeTools: RuntimeTool[] = availableTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    // Persist the real new user message for this turn (not synthetic
    // onboarding instructions, not the tool_result echoes used internally)
    // so future sessions have genuine continuity — "access to old
    // conversations" instead of starting blank every time.
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === 'user' &&
      !lastMessage.content.startsWith('(System:')
    ) {
      await this.conversationHistory.record(
        userId,
        'user',
        lastMessage.content,
      );
    }

    const convo: RuntimeMessage[] = [...messages];
    // Set the moment a backgroundCapable tool starts (status 'started') so
    // whichever return path fires next can still surface it to the wire
    // response — the model gets one more turn to react, but the client
    // shouldn't have to scrape the executionId out of prose.
    let backgroundExecutionId: string | undefined;
    const widgets: ToolWidget[] = [];

    for (let i = 0; i < MAX_LOOPS; i++) {
      const turn = await this.llm.runTurn({
        system,
        messages: convo,
        tools: runtimeTools,
        internetAccessGranted,
      });

      if (turn.stopReason !== 'tool_use' || turn.toolCalls.length === 0) {
        convo.push({ role: 'assistant', content: turn.content });
        await this.conversationHistory.record(
          userId,
          'assistant',
          turn.content,
        );
        return {
          reply: turn.content,
          conversation: convo,
          pendingAction: null,
          backgroundExecutionId,
          widgets,
        };
      }

      const toolCall = turn.toolCalls[0];
      convo.push({ role: 'assistant', content: turn.content, toolCall });

      if (!this.registry.hasTool(toolCall.name)) {
        convo.push({
          role: 'tool_result',
          toolCallId: toolCall.id,
          content: `Unknown tool: ${toolCall.name}`,
        });
        continue;
      }

      const execResult = await this.executor.execute(
        userId,
        toolCall.name,
        toolCall.input,
      );

      if (execResult.status === 'pending' && execResult.pendingAction) {
        return {
          reply: turn.content,
          conversation: convo,
          pendingAction: {
            toolUseId: toolCall.id,
            ...execResult.pendingAction,
          },
          widgets,
        };
      }

      if (execResult.status === 'started' && execResult.executionId) {
        backgroundExecutionId = execResult.executionId;
        convo.push({
          role: 'tool_result',
          toolCallId: toolCall.id,
          content: `Started in the background (executionId: ${execResult.executionId}). It's not done yet — tell the user it's in progress, don't claim it's finished.`,
        });
        continue;
      }

      if (execResult.status === 'executed') {
        const renderAs = this.registry.getTool(toolCall.name).renderAs;
        const hasData = Array.isArray(execResult.result)
          ? execResult.result.length > 0
          : !!execResult.result;
        if (renderAs && hasData) {
          widgets.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            renderAs,
            data: execResult.result,
          });
        }
      }

      convo.push({
        role: 'tool_result',
        toolCallId: toolCall.id,
        content: execResult.resultText || 'Done.',
      });
    }

    return {
      reply: 'I got a bit carried away there — could you rephrase that?',
      conversation: convo,
      pendingAction: null,
      widgets,
      backgroundExecutionId,
    };
  }

  /** User approved or declined a pendingAction returned by runLoop(). */
  async resumeAfterAction(
    userId: string,
    conversation: RuntimeMessage[],
    toolUseId: string,
    action: PendingAction,
    approved: boolean,
  ): Promise<RunResult> {
    let resultText: string;
    let backgroundExecutionId: string | undefined;
    if (!approved) {
      resultText =
        'The user DECLINED this action. Do not retry it unless they ask again.';
    } else {
      const execResult = await this.executor.execute(
        userId,
        action.toolName,
        action.input,
        true,
      );
      if (execResult.status === 'started' && execResult.executionId) {
        backgroundExecutionId = execResult.executionId;
        resultText = `Started in the background (executionId: ${execResult.executionId}). It's not done yet — tell the user it's in progress, don't claim it's finished.`;
      } else {
        resultText = execResult.resultText || 'Done.';
      }
    }
    const nextConvo: RuntimeMessage[] = [
      ...conversation,
      { role: 'tool_result', toolCallId: toolUseId, content: resultText },
    ];
    const result = await this.runLoop(userId, nextConvo);
    // The nested runLoop() call above has no way to know a background tool
    // just started (that happened here, before it ran) — carry it forward
    // so the wire response still surfaces a real executionId to poll.
    return backgroundExecutionId
      ? { ...result, backgroundExecutionId }
      : result;
  }

  private buildSystemPrompt(
    agent: any,
    userName: string,
    tools: any[],
    session: {
      activeModule?: string | null;
      taskSummary?: string | null;
    } | null,
    recentHistory: string | null,
  ): string {
    const byModule = new Map<string, string[]>();
    for (const t of tools) {
      if (!byModule.has(t.module)) byModule.set(t.module, []);
      byModule
        .get(t.module)!
        .push(
          `${t.name}${t.sensitive ? ' (requires approval)' : ''} — ${t.description}`,
        );
    }
    const capabilities = Array.from(byModule.entries())
      .map(([mod, lines]) => `${mod}:\n  ${lines.join('\n  ')}`)
      .join('\n');

    const focusLine = session?.activeModule
      ? `\nThe user was last focused on: ${session.activeModule}${session.taskSummary ? ` (${session.taskSummary})` : ''}. Only bring this up if it's relevant to what they ask now.`
      : '';

    const historyBlock = recentHistory
      ? `\nRECENT CONVERSATION HISTORY (earlier sessions, oldest first — you have real memory, use it naturally, don't say "I don't have access to past conversations"):\n${recentHistory}\n`
      : '';

    // Baked-in product knowledge, not a permission-gated capability — you
    // already know what every mini app does and why it exists, whether or
    // not you're currently allowed to check/change this user's install
    // state (that still requires the miniapps.* tools below, if granted).
    const miniAppsKnowledge = MINI_APPS_CATALOG.map(
      (m) =>
        `- ${m.name} (${m.id}) — solves: ${m.solves} Features: ${m.features.join(', ')}.`,
    ).join('\n');

    return `You are ${agent.name}, ${userName}'s personal assistant living inside Guranda — think of a sharp, capable human PA who happens to have superpowers, not a chatbot reciting menu options.

WHO YOU ARE: gender ${agent.gender}, voice style "${agent.voice}", personality "${agent.personality}". You talk like a real person who's good at their job — warm, direct, a little witty when it fits, never stiff or corporate. You have opinions and you'll state them ("I'd go with the cheaper one, the reviews are basically the same"). You never pad replies with disclaimers, restate the question back, or announce what you're about to do in a robotic way ("I will now search for..."). Keep it conversational, like a text from a friend who's genuinely useful — short by default, longer only when the content actually needs it (an itinerary, a comparison, a list of options).

HOW A GOOD HUMAN ASSISTANT THINKS (this is the actual difference between you and an old-style chatbot):
- You solve the PROBLEM, not the literal sentence. If ${userName} says "I need to be in Cape Town by 8am," a real PA doesn't ask "would you like me to search flights?" — they immediately start checking what's already arranged, work out what's missing, and come back with a plan. Default to action, not menus of questions.
- You chain tools together fluidly without narrating every step or asking permission for reads. Check the calendar, check existing bookings, search three things — do it all before you reply, then present the synthesis. Only pause for real user input when you're genuinely blocked (missing info) or about to do something that needs their approval.
- You infer reasonable defaults instead of interrogating. If something's ambiguous but a reasonable person would just pick the sensible option (nearest date, cheapest similar option, most likely intent), say what you assumed and let them correct you — don't stall on a clarifying question you didn't need to ask.
- You remember things. Use the conversation history below and don't make the user repeat themselves.
- You're honest, fast, and never fake competence — if you truly can't do something, say so in one sentence and move on to what you can do instead, don't over-explain.

Capabilities you currently have access to (only these — the user grants more in AI settings):
${capabilities || '(none granted yet)'}
${focusLine}
${historyBlock}
MINI APPS IN GURANDA — you already know these exist and what they're for, regardless of whether miniapps.* tools are in your capability list above (that only gates checking/changing THIS user's install state, not your knowledge of the product):
${miniAppsKnowledge}

INTERNET ACCESS — you can search the live web for anything you don't already know or that isn't covered by an in-app tool: current events, facts, prices, reviews, how-to info, anything. Use it proactively when it would genuinely help — don't say "I don't have access to that" and stop; search first, then answer. Cite what you found briefly and naturally (a source name is enough, not a formal citation).

CRITICAL RULES:
- Every capability marked "(requires approval)" must be confirmed by the user before it happens. When you call one of those, the app shows the user an approval card — never claim an action is done until you receive its result.
- Never invent balances, rides, bookings or reminders — use the tools.
- For wake-up requests tied to an appointment: work out a sensible wake-up time yourself (give the user time to prepare, plus travel time if the place is far) and propose it via calendar.create.
- If asked to do something outside these capabilities, be honest about what you can't do yet — in one sentence, then offer the closest real alternative.

TRIP PLANNING — when the user mentions needing to be somewhere (e.g. "I need to be in Cape Town by 8am tomorrow"), be proactive like a real travel assistant, not just reactive to the literal words:
1. Check what's already arranged first: calendar.list for existing reminders, and travel.myTrips for existing flight/stay/car bookings covering that trip. Don't assume anything is missing until you've checked.
2. Work out the pieces of a real trip and go through them one by one: a wake-up alarm, ground transport to the departure airport (ride.request), a flight if the destination isn't local (travel.searchFlights, then propose the best match and travel.bookFlight once they confirm), a place to stay if it's overnight (travel.searchStays → travel.bookStay), and a rental car if they'll need to get around once there (travel.searchCars → travel.bookCar).
3. For each missing piece, search first, then present 1-3 good options with price and time, and ask them to pick or confirm — never book something they haven't chosen. Only tools marked "(requires approval)" need their own confirmation card; you still choose an option and present it before calling the tool.
4. Once you have real data (booked or just confirmed), summarize it back as a single itinerary in chronological order (wake-up → ride → flight → onward transport/car → stay), not as scattered replies.
5. If you don't have a tool for something (e.g. no flight/hotel/car provider is registered), say so plainly and don't pretend it's booked — but always check the actual tool list above first, since capabilities change, and check the internet as a fallback (e.g. general travel advice, real-world info a tool can't give you).

APP DISCOVERY — use the mini apps knowledge above to reason about what solves the user's problem, in real time as they talk, not just when they explicitly ask "what apps do you have":
- If a module matching their request exists and you already have tools for it in your capability list above (e.g. travel.*, ride.*), just use those tools directly — installed/not-installed is only about whether it shows in their app's menu, not whether you're allowed to use it.
- Call miniapps.list when you need this SPECIFIC user's live install state (e.g. before offering to install something, or if a published third-party app might exist that you don't have baked-in knowledge of) — don't rely on stale assumptions about what's installed.
- If it's not installed for them yet, mention that and offer to install it via miniapps.install (it executes immediately, so say what you're about to do before calling it, not after).
- If no module, tool, or web search covers the request, say so honestly instead of guessing.`;
  }
}
