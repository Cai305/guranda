import { Provider } from '@nestjs/common';
import { defineTools } from '../tool-registry/define-tools';
import { ContextManagerService } from './context-manager.service';
import { SPECIALIST_AGENTS } from './specialist-agents';

export const orchestratorToolsProvider: Provider = {
  provide: 'ORCHESTRATOR_TOOLS',
  inject: [ContextManagerService],
  useFactory: (contextManager: ContextManagerService) => {
    defineTools('orchestrator', [
      {
        name: 'orb.delegate',
        description: 'Delegate the conversation to a Specialist AI agent. Use this when the user asks for something that falls under a specific specialist domain (e.g. shopping, travel, gaming). This tool ends your turn and hands over to the specialist.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: `The ID of the specialist agent to delegate to. Allowed values: ${SPECIALIST_AGENTS.map((a) => a.id).join(', ')}`,
            },
          },
          required: ['agentId'],
        },
        sensitive: false,
        defaultGranted: true,
        permissionKey: 'core.basic', // Implicitly allowed
        handler: async ({ userId }, { agentId }) => {
          const validAgent = SPECIALIST_AGENTS.find((a) => a.id === agentId);
          if (!validAgent) {
            throw new Error(`Invalid agent ID: ${agentId}`);
          }
          await contextManager.touch(userId, { activeAgentId: agentId });
          return { success: true, delegatedTo: validAgent.name };
        },
        describeResult: (_, result) =>
          `Successfully delegated control to ${result.delegatedTo}. The specialist is now active.`,
      },
      {
        name: 'specialist.yield',
        description: 'Yield control back to the main Orb. Call this when you (the specialist AI) have completed your task, or if the user asks something outside your domain.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        sensitive: false,
        defaultGranted: true,
        permissionKey: 'core.basic', // Implicitly allowed
        handler: async ({ userId }) => {
          await contextManager.touch(userId, { activeAgentId: null });
          return { success: true, yielded: true };
        },
        describeResult: () =>
          'Successfully yielded control. The main Orb is now active.',
      },
    ]);
    return null;
  },
};
