import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ContextManagerService } from './context-manager.service';
import { ActionExecutorService } from './action-executor.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { ConversationHistoryService } from './conversation-history.service';
import { CompanionChatService } from './companion-chat.service';
import { AnthropicAdapter } from './anthropic-adapter';
import { LLM_ADAPTER } from './llm-adapter.token';

@Module({
  providers: [
    PrismaService,
    ContextManagerService,
    ActionExecutorService,
    AgentRuntimeService,
    ConversationHistoryService,
    CompanionChatService,
    { provide: LLM_ADAPTER, useClass: AnthropicAdapter },
  ],
  exports: [
    AgentRuntimeService,
    ActionExecutorService,
    ContextManagerService,
    ConversationHistoryService,
    CompanionChatService,
    LLM_ADAPTER,
  ],
})
export class AiRuntimeModule {}
