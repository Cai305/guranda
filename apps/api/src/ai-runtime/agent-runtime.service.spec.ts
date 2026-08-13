import { AgentRuntimeService } from './agent-runtime.service';
import { ActionExecutorService } from './action-executor.service';
import { ContextManagerService } from './context-manager.service';
import { ConversationHistoryService } from './conversation-history.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { ToolDefinition } from '../tool-registry/tool-registry.types';
import { FakeLlmAdapter } from './test/fake-llm-adapter';
import { RuntimeTurnResult } from './llm-adapter.interface';
import { WidgetActionResolverService } from './widget-action-resolver.service';

function makePrismaMock(agentPermissions: Record<string, boolean>) {
  const logs = new Map<string, any>();
  let logSeq = 0;
  return {
    aiAgent: {
      findUnique: jest.fn().mockResolvedValue({
        name: 'Aura',
        gender: 'neutral',
        voice: 'warm',
        personality: 'companion',
        permissions: agentPermissions,
      }),
    },
    userProfile: {
      findUnique: jest.fn().mockResolvedValue({ displayName: 'Sam' }),
    },
    aiSession: {
      upsert: jest.fn(async ({ where, create, update }: any) => ({
        userId: where.userId,
        ...create,
        ...update,
      })),
      update: jest.fn(async ({ where, data }: any) => ({
        userId: where.userId,
        ...data,
      })),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    toolExecutionLog: {
      create: jest.fn(async ({ data }: any) => {
        const id = `log-${++logSeq}`;
        logs.set(id, { id, ...data });
        return { id, ...data };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = { ...logs.get(where.id), ...data };
        logs.set(where.id, row);
        return row;
      }),
    },
    aiConversationMessage: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function buildRuntime(
  prisma: any,
  tools: ToolDefinition[],
  script: RuntimeTurnResult[],
) {
  const registry = new ToolRegistryService();
  registry.registerMany(tools);
  const contextManager = new ContextManagerService(prisma);
  const executor = new ActionExecutorService(prisma, registry, contextManager);
  const llm = new FakeLlmAdapter(script);
  const conversationHistory = new ConversationHistoryService(prisma);
  const widgetActionResolver = new WidgetActionResolverService(prisma);
  const runtime = new AgentRuntimeService(
    llm,
    prisma,
    registry,
    executor,
    contextManager,
    conversationHistory,
    widgetActionResolver,
  );
  return { runtime, llm, registry };
}

const readTool: ToolDefinition = {
  name: 'demo.read',
  description: 'reads',
  inputSchema: { type: 'object' },
  permissionKey: 'demo.read',
  sensitive: false,
  module: 'demo',
  defaultGranted: true,
  handler: async () => ({ value: 7 }),
  describeResult: (_i, o) => `value=${o.value}`,
};

const sendTool: ToolDefinition = {
  name: 'demo.send',
  description: 'sends',
  inputSchema: { type: 'object' },
  permissionKey: 'demo.send',
  sensitive: true,
  module: 'demo',
  defaultGranted: false,
  handler: async (_ctx, input) => ({ sent: input.amount }),
  describeAction: (i) => `Send ${i.amount}`,
  describeResult: (_i, o) => `Sent ${o.sent}`,
};

describe('AgentRuntimeService', () => {
  it('only offers tools the user has permission for (permission filtering via the registry)', async () => {
    const prisma = makePrismaMock({ 'demo.read': true }); // demo.send NOT granted
    const { runtime, llm } = buildRuntime(
      prisma,
      [readTool, sendTool],
      [
        {
          content: 'Sure, here you go.',
          toolCalls: [],
          stopReason: 'end_turn',
        },
      ],
    );
    await runtime.runLoop('u1', [{ role: 'user', content: 'hi' }]);
    const toolsOffered = llm.callHistory[0].tools.map((t) => t.name);
    expect(toolsOffered).toEqual(['demo.read']);
  });

  it('resolves a read tool call, feeds the result back, and returns the final reply', async () => {
    const prisma = makePrismaMock({ 'demo.read': true });
    const { runtime, llm } = buildRuntime(
      prisma,
      [readTool],
      [
        {
          content: '',
          toolCalls: [{ id: 'call1', name: 'demo.read', input: {} }],
          stopReason: 'tool_use',
        },
        { content: 'The value is 7.', toolCalls: [], stopReason: 'end_turn' },
      ],
    );
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: 'read it' },
    ]);
    expect(result.reply).toBe('The value is 7.');
    expect(result.pendingAction).toBeNull();
    expect(llm.callHistory).toHaveLength(2);
    // second call's conversation must contain the tool_result we fed back
    const secondCallMessages = llm.callHistory[1].messages;
    expect(
      secondCallMessages.some(
        (m) => m.role === 'tool_result' && m.content === 'value=7',
      ),
    ).toBe(true);
  });

  it('a sensitive tool call stops the loop and returns pendingAction WITHOUT executing', async () => {
    const prisma = makePrismaMock({ 'demo.send': true });
    const { runtime, llm } = buildRuntime(
      prisma,
      [sendTool],
      [
        {
          content: 'Sending that now.',
          toolCalls: [{ id: 'call1', name: 'demo.send', input: { amount: 9 } }],
          stopReason: 'tool_use',
        },
      ],
    );
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: 'send 9' },
    ]);
    expect(result.pendingAction).toEqual({
      toolUseId: 'call1',
      toolName: 'demo.send',
      input: { amount: 9 },
      summary: 'Send 9',
    });
    expect(llm.callHistory).toHaveLength(1); // never looped again to execute
  });

  it('resumeAfterAction executes the approved tool and continues the conversation', async () => {
    const prisma = makePrismaMock({ 'demo.send': true });
    const { runtime } = buildRuntime(
      prisma,
      [sendTool],
      [
        {
          content: 'Done! Anything else?',
          toolCalls: [],
          stopReason: 'end_turn',
        },
      ],
    );
    const result = await runtime.resumeAfterAction(
      'u1',
      [{ role: 'user', content: 'send 9' }],
      'call1',
      { toolName: 'demo.send', input: { amount: 9 }, summary: 'Send 9' },
      true,
    );
    expect(result.reply).toBe('Done! Anything else?');
    // the tool_result fed back into the resumed loop should reflect real execution
    const toolResultMsg = result.conversation.find(
      (m) => m.role === 'tool_result',
    );
    expect((toolResultMsg as any).content).toBe('Sent 9');
  });

  it('resumeAfterAction with approved=false never calls the handler', async () => {
    const prisma = makePrismaMock({ 'demo.send': true });
    const handlerSpy = jest.spyOn(sendTool, 'handler');
    const { runtime } = buildRuntime(
      prisma,
      [sendTool],
      [{ content: 'No problem.', toolCalls: [], stopReason: 'end_turn' }],
    );
    await runtime.resumeAfterAction(
      'u1',
      [],
      'call1',
      { toolName: 'demo.send', input: { amount: 9 }, summary: 'Send 9' },
      false,
    );
    expect(handlerSpy).not.toHaveBeenCalled();
  });

  it('stops after MAX_LOOPS (14) iterations with a fallback message if the model keeps calling tools', async () => {
    const prisma = makePrismaMock({ 'demo.read': true });
    const infiniteScript: RuntimeTurnResult[] = Array.from(
      { length: 20 },
      () => ({
        content: '',
        toolCalls: [{ id: 'call', name: 'demo.read', input: {} }],
        stopReason: 'tool_use',
      }),
    );
    const { runtime, llm } = buildRuntime(prisma, [readTool], infiniteScript);
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: 'go' },
    ]);
    expect(llm.callHistory).toHaveLength(14);
    expect(result.reply).toContain('carried away');
  });

  it('a widget-producing tool call records itself as the active widget', async () => {
    const listTool: ToolDefinition = {
      ...readTool,
      name: 'demo.list',
      permissionKey: 'demo.list',
      renderAs: 'product-list',
      handler: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    };
    const prisma = makePrismaMock({ 'demo.list': true });
    const { runtime } = buildRuntime(
      prisma,
      [listTool],
      [
        {
          content: '',
          toolCalls: [{ id: 'call1', name: 'demo.list', input: {} }],
          stopReason: 'tool_use',
        },
        { content: 'Here are some.', toolCalls: [], stopReason: 'end_turn' },
      ],
    );
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: 'find me a macbook' },
    ]);
    expect(result.widgets).toHaveLength(1);
    expect(prisma.aiSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          activeWidgetToolCallId: 'call1',
          activeWidgetRenderAs: 'product-list',
          activeWidgetItemCount: 3,
          activeWidgetSelectedIndex: 0,
        }),
      }),
    );
  });

  it('"next" resolves directly against the active widget without calling the LLM', async () => {
    const prisma = makePrismaMock({});
    prisma.aiSession.findUnique.mockResolvedValueOnce({
      userId: 'u1',
      activeWidgetToolCallId: 'call1',
      activeWidgetRenderAs: 'product-list',
      activeWidgetItemCount: 3,
      activeWidgetSelectedIndex: 0,
      activeAgentId: null,
    });
    const { runtime, llm } = buildRuntime(prisma, [], []);
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: 'next' },
    ]);
    expect(llm.callHistory).toHaveLength(0); // never called the model at all
    expect(result.widgetSelection).toEqual({
      toolCallId: 'call1',
      selectedIndex: 1,
    });
    expect(result.widgets).toEqual([]);
  });

  it('"the second one" resolves to index 1 via ordinal matching', async () => {
    const prisma = makePrismaMock({});
    prisma.aiSession.findUnique.mockResolvedValueOnce({
      userId: 'u1',
      activeWidgetToolCallId: 'call1',
      activeWidgetRenderAs: 'product-list',
      activeWidgetItemCount: 5,
      activeWidgetSelectedIndex: 0,
      activeAgentId: null,
    });
    const { runtime, llm } = buildRuntime(prisma, [], []);
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: 'the second one' },
    ]);
    expect(llm.callHistory).toHaveLength(0);
    expect(result.widgetSelection).toEqual({
      toolCallId: 'call1',
      selectedIndex: 1,
    });
  });

  it('a long message containing "next" is NOT hijacked as a widget action', async () => {
    const prisma = makePrismaMock({ 'demo.read': true });
    prisma.aiSession.findUnique.mockResolvedValueOnce({
      userId: 'u1',
      activeWidgetToolCallId: 'call1',
      activeWidgetRenderAs: 'product-list',
      activeWidgetItemCount: 3,
      activeWidgetSelectedIndex: 0,
      activeAgentId: null,
    });
    const { runtime, llm } = buildRuntime(
      prisma,
      [readTool],
      [
        {
          content: "Here's what's happening next week.",
          toolCalls: [],
          stopReason: 'end_turn',
        },
      ],
    );
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: "what's happening next week in Cape Town" },
    ]);
    expect(llm.callHistory).toHaveLength(1); // fell through to the normal loop
    expect(result.widgetSelection).toBeUndefined();
  });

  it('falls through to the LLM loop when there is no active widget', async () => {
    const prisma = makePrismaMock({ 'demo.read': true }); // aiSession.findUnique returns null by default
    const { runtime, llm } = buildRuntime(
      prisma,
      [readTool],
      [{ content: 'Sure.', toolCalls: [], stopReason: 'end_turn' }],
    );
    const result = await runtime.runLoop('u1', [
      { role: 'user', content: 'next' },
    ]);
    expect(llm.callHistory).toHaveLength(1);
    expect(result.widgetSelection).toBeUndefined();
  });
});
