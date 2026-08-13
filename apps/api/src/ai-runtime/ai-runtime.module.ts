import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ContextManagerService } from './context-manager.service';
import { ActionExecutorService } from './action-executor.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { ConversationHistoryService } from './conversation-history.service';
import { CompanionChatService } from './companion-chat.service';
import { AnthropicAdapter } from './anthropic-adapter';
import { LLM_ADAPTER } from './llm-adapter.token';
import { WidgetActionResolverService } from './widget-action-resolver.service';
import { InteractionEngineService } from './interaction-engine.service';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

import { orchestratorToolsProvider } from './orchestrator-tools.provider';

@Module({
  imports: [FeatureFlagsModule],
  providers: [
    PrismaService,
    ContextManagerService,
    ActionExecutorService,
    AgentRuntimeService,
    ConversationHistoryService,
    CompanionChatService,
    WidgetActionResolverService,
    InteractionEngineService,
    { provide: LLM_ADAPTER, useClass: AnthropicAdapter },
    orchestratorToolsProvider,
  ],
  exports: [
    AgentRuntimeService,
    ActionExecutorService,
    ContextManagerService,
    ConversationHistoryService,
    CompanionChatService,
    WidgetActionResolverService,
    InteractionEngineService,
    LLM_ADAPTER,
  ],
})
export class AiRuntimeModule {}
