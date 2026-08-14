import { BadRequestException } from '@nestjs/common';
import { ActionExecutorService } from './action-executor.service';
import { ContextManagerService } from './context-manager.service';
import { CapabilityGrantService } from '../capabilities/capability-grant.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { ToolDefinition } from '../tool-registry/tool-registry.types';

function makePrismaMock() {
  const logs = new Map<string, any>();
  let logSeq = 0;
  return {
    aiAgent: { findUnique: jest.fn() },
    aiSession: { upsert: jest.fn().mockResolvedValue({}) },
    toolExecutionLog: {
      create: jest.fn(async ({ data }: any) => {
        const id = `log-${++logSeq}`;
        const row = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        logs.set(id, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = { ...logs.get(where.id), ...data };
        logs.set(where.id, row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }: any) => logs.get(where.id) ?? null),
    },
    _logs: logs,
  };
}

describe('ActionExecutorService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let registry: ToolRegistryService;
  let contextManager: ContextManagerService;
  let executor: ActionExecutorService;

  const readTool: ToolDefinition = {
    name: 'demo.read',
    description: 'reads something',
    inputSchema: { type: 'object' },
    permissionKey: 'demo.read',
    legacyAliases: ['legacyDemoRead'],
    sensitive: false,
    module: 'demo',
    defaultGranted: true,
    handler: async () => ({ value: 42 }),
    describeResult: (_i, output) => `The value is ${output.value}`,
  };

  const sensitiveTool: ToolDefinition = {
    name: 'demo.send',
    description: 'sends something',
    inputSchema: { type: 'object' },
    permissionKey: 'demo.send',
    sensitive: true,
    module: 'demo',
    defaultGranted: false,
    handler: jest.fn(async (_ctx, input) => ({ sent: input.amount })),
    describeAction: (input) => `Send ${input.amount}`,
    describeResult: (_i, output) => `Sent ${output.sent}`,
  };

  const failingTool: ToolDefinition = {
    name: 'demo.fail',
    description: 'always fails with a business error',
    inputSchema: { type: 'object' },
    permissionKey: 'demo.read',
    sensitive: false,
    module: 'demo',
    defaultGranted: true,
    handler: async () => {
      throw new BadRequestException('Not enough balance');
    },
  };

  beforeEach(() => {
    prisma = makePrismaMock();
    registry = new ToolRegistryService();
    registry.registerMany([readTool, sensitiveTool, failingTool]);
    contextManager = new ContextManagerService(prisma as any);
    executor = new ActionExecutorService(
      prisma as any,
      registry,
      contextManager,
      new CapabilityGrantService(prisma as any),
    );
  });

  it('denies execution when the permission is not granted', async () => {
    prisma.aiAgent.findUnique.mockResolvedValue({ permissions: {} });
    const result = await executor.execute('u1', 'demo.read', {});
    expect(result.status).toBe('denied');
  });

  it('allows execution via a legacy alias permission key', async () => {
    prisma.aiAgent.findUnique.mockResolvedValue({
      permissions: { legacyDemoRead: true },
    });
    const result = await executor.execute('u1', 'demo.read', {});
    expect(result.status).toBe('executed');
    expect(result.resultText).toBe('The value is 42');
  });

  it('a sensitive tool returns pendingAction and does NOT call the handler', async () => {
    prisma.aiAgent.findUnique.mockResolvedValue({
      permissions: { 'demo.send': true },
    });
    const result = await executor.execute('u1', 'demo.send', { amount: 5 });
    expect(result.status).toBe('pending');
    expect(result.pendingAction?.summary).toBe('Send 5');
    expect(sensitiveTool.handler).not.toHaveBeenCalled();
  });

  it('a sensitive tool executes for real once approved=true, and logs a SUCCESS row', async () => {
    prisma.aiAgent.findUnique.mockResolvedValue({
      permissions: { 'demo.send': true },
    });
    const result = await executor.execute(
      'u1',
      'demo.send',
      { amount: 5 },
      true,
    );
    expect(result.status).toBe('executed');
    expect(result.resultText).toBe('Sent 5');
    const logRows = Array.from(prisma._logs.values());
    expect(
      logRows.some(
        (r: any) => r.toolName === 'demo.send' && r.status === 'SUCCESS',
      ),
    ).toBe(true);
  });

  it('a failing tool logs a FAILED row and returns a friendly message, without retrying a 4xx business error', async () => {
    prisma.aiAgent.findUnique.mockResolvedValue({
      permissions: { 'demo.read': true },
    });
    const result = await executor.execute('u1', 'demo.fail', {});
    expect(result.status).toBe('executed');
    expect(result.resultText).toContain('Not enough balance');
    const logRows = Array.from(prisma._logs.values());
    const failRow = logRows.find((r: any) => r.toolName === 'demo.fail');
    expect(failRow.status).toBe('FAILED');
    expect(failRow.error).toContain('Not enough balance');
  });

  it('touches the context manager (AiSession) after a successful execution', async () => {
    prisma.aiAgent.findUnique.mockResolvedValue({
      permissions: { 'demo.read': true },
    });
    const upsertSpy = jest.fn();
    (prisma as any).aiSession = { upsert: upsertSpy };
    await executor.execute('u1', 'demo.read', {});
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });
});
