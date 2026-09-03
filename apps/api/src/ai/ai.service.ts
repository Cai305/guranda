import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { AgentRuntimeService } from '../ai-runtime/agent-runtime.service';
import { ActionExecutorService } from '../ai-runtime/action-executor.service';
import { ConversationHistoryService } from '../ai-runtime/conversation-history.service';
import { CompanionChatService } from '../ai-runtime/companion-chat.service';
import { InteractionEngineService } from '../ai-runtime/interaction-engine.service';
import { RuntimeMessage } from '../ai-runtime/llm-adapter.interface';

// The mobile client's on-the-wire pendingAction shape predates the Tool
// Registry (it says "name", the registry says "toolName") — translated at
// this boundary so AiChatScreen.tsx needs zero changes.
export interface WirePendingAction {
  toolUseId: string;
  name: string;
  input: any;
  summary: string;
}

function toWirePendingAction(
  p: {
    toolUseId: string;
    toolName: string;
    input: any;
    summary: string;
  } | null,
): WirePendingAction | null {
  if (!p) return null;
  return {
    toolUseId: p.toolUseId,
    name: p.toolName,
    input: p.input,
    summary: p.summary,
  };
}

// Thin consumer of the Tool Registry / Agent Runtime. All the tool-use loop
// mechanics (buildTools/executeRead/executeAction/isActionTool/describeAction)
// that used to live here have moved to apps/api/src/ai-runtime/ and
// apps/api/src/tool-registry/, generalized from a hardcoded 3-tool allowlist
// to any module's self-registered tools.
@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private toolRegistry: ToolRegistryService,
    private runtime: AgentRuntimeService,
    private conversationHistory: ConversationHistoryService,
    private executor: ActionExecutorService,
    private companionChatService: CompanionChatService,
    private interactionEngine: InteractionEngineService,
  ) {}

  listCompanions(userId?: string) {
    return this.companionChatService.listCompanions(userId);
  }

  async getCompanionHistory(userId: string, companionId: string) {
    return this.companionChatService.getHistory(userId, companionId);
  }

  async companionChat(userId: string, companionId: string, message: string) {
    return this.interactionEngine.handle({
      source: 'text',
      persona: 'companion',
      userId,
      companionId,
      message,
    });
  }

  async getAgent(userId: string) {
    return this.prisma.aiAgent.findUnique({ where: { userId } });
  }

  async upsertAgent(userId: string, dto: any) {
    const data = {
      name: dto.name ?? undefined,
      gender: dto.gender ?? undefined,
      voice: dto.voice ?? undefined,
      personality: dto.personality ?? undefined,
      permissions: dto.permissions ?? undefined,
      onboarded: dto.onboarded ?? undefined,
      handsFreeMode: dto.handsFreeMode ?? undefined,
    };
    return this.prisma.aiAgent.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        name: dto.name || 'Aura',
        gender: dto.gender || 'neutral',
        voice: dto.voice || 'warm',
        personality: dto.personality || 'companion',
        permissions: dto.permissions || {},
        handsFreeMode: dto.handsFreeMode ?? false,
      },
    });
  }

  /** For AiAccessScreen: one entry per permission key (several tools may share one), so the UI shows one toggle per grantable capability, not one per tool. */
  listAvailableTools() {
    const tools = this.toolRegistry.listTools();
    const byPermission = new Map<
      string,
      {
        permissionKey: string;
        module: string;
        description: string;
        sensitive: boolean;
        defaultGranted: boolean;
        toolNames: string[];
      }
    >();
    for (const t of tools) {
      if (!byPermission.has(t.permissionKey)) {
        byPermission.set(t.permissionKey, {
          permissionKey: t.permissionKey,
          module: t.module,
          description: t.description,
          sensitive: t.sensitive,
          defaultGranted: t.defaultGranted,
          toolNames: [],
        });
      }
      const entry = byPermission.get(t.permissionKey)!;
      entry.toolNames.push(t.name);
      entry.sensitive = entry.sensitive || t.sensitive;
    }
    // Web search isn't a Tool Registry entry (Anthropic's hosted search tool
    // is wired directly into anthropic-adapter.ts, not through the executor),
    // but it's still a real capability the user can see and toggle off.
    byPermission.set('internet.search', {
      permissionKey: 'internet.search',
      module: 'internet',
      description:
        'Search the live web for anything not covered by an in-app tool',
      sensitive: false,
      defaultGranted: true,
      toolNames: ['web_search'],
    });
    return Array.from(byPermission.values());
  }

  /** For AiChatScreen: real cross-session history so the chat doesn't start blank every time. */
  async getHistory(userId: string) {
    return this.conversationHistory.getRecent(userId);
  }

  /** Polling target for backgroundCapable tools (e.g. finance.contribute) — client gets an executionId from the 'started' status and polls this until it flips to SUCCESS/FAILED. */
  async getExecution(userId: string, executionId: string) {
    return this.executor.getExecution(userId, executionId);
  }

  async chat(userId: string, messages: RuntimeMessage[]) {
    const result = await this.interactionEngine.handle({
      source: 'text',
      persona: 'agent',
      userId,
      messages,
    });
    return {
      reply: result.reply,
      conversation: result.conversation,
      pendingAction: toWirePendingAction(result.pendingAction ?? null),
      backgroundExecutionId: result.backgroundExecutionId,
      widgets: result.widgets,
      widgetSelection: result.widgetSelection,
      activeAgent: result.activeAgent,
    };
  }

  /** First conversation after setup: the agent welcomes the user and tours the app. */
  async welcome(userId: string) {
    const result = await this.interactionEngine.handle({
      source: 'text',
      persona: 'agent',
      userId,
      messages: [
        {
          role: 'user',
          content:
            '(System: the user has just finished setting you up for the first time. ' +
            'Greet them warmly by their name and introduce yourself by your own name — that\'s it. ' +
            'One or two short sentences, like a text message, not a tour or a features list. ' +
            'Sound like a companion, not a manual.)',
        },
      ],
    });
    await this.prisma.aiAgent.update({
      where: { userId },
      data: { onboarded: true },
    });
    return {
      reply: result.reply,
      conversation: result.conversation,
      pendingAction: toWirePendingAction(result.pendingAction ?? null),
      backgroundExecutionId: result.backgroundExecutionId,
      widgets: result.widgets,
      activeAgent: result.activeAgent,
    };
  }

  /** User approved or rejected a pending action returned by chat()/welcome(). */
  async resolveAction(
    userId: string,
    conversation: RuntimeMessage[],
    action: WirePendingAction,
    approved: boolean,
  ) {
    const result = await this.runtime.resumeAfterAction(
      userId,
      conversation,
      action.toolUseId,
      { toolName: action.name, input: action.input, summary: action.summary },
      approved,
    );
    return {
      reply: result.reply,
      conversation: result.conversation,
      pendingAction: toWirePendingAction(result.pendingAction),
      backgroundExecutionId: result.backgroundExecutionId,
      widgets: result.widgets,
      activeAgent: result.activeAgent,
    };
  }
}
