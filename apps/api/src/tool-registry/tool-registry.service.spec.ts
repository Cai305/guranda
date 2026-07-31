import { ToolRegistryService } from './tool-registry.service';
import { defineTools } from './define-tools';
import { ToolDefinition } from './tool-registry.types';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'demo.echo',
    description: 'Echoes the input back.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
    permissionKey: 'demo.read',
    sensitive: false,
    module: 'demo',
    defaultGranted: true,
    handler: async (_ctx, input) => input,
    ...overrides,
  };
}

describe('ToolRegistryService', () => {
  let registry: ToolRegistryService;

  beforeEach(() => {
    registry = new ToolRegistryService();
  });

  it('registers and retrieves a tool by name', () => {
    registry.register(makeTool());
    expect(registry.getTool('demo.echo').description).toBe(
      'Echoes the input back.',
    );
    expect(registry.hasTool('demo.echo')).toBe(true);
  });

  it('throws NotFoundException for an unknown tool', () => {
    expect(() => registry.getTool('nope.nope')).toThrow('not found');
  });

  it('rejects a duplicate tool name', () => {
    registry.register(makeTool());
    expect(() => registry.register(makeTool())).toThrow('already registered');
  });

  it('lists tools filtered by module', () => {
    registry.register(makeTool({ name: 'wallet.read', module: 'wallet' }));
    registry.register(makeTool({ name: 'ride.status', module: 'ride' }));
    expect(registry.listTools({ module: 'wallet' }).map((t) => t.name)).toEqual(
      ['wallet.read'],
    );
  });

  it('lists tools filtered by permission key, honoring legacy aliases', () => {
    registry.register(
      makeTool({
        name: 'wallet.read',
        permissionKey: 'wallet.read',
        legacyAliases: ['walletRead'],
      }),
    );
    registry.register(
      makeTool({ name: 'ride.status', permissionKey: 'ride.read' }),
    );
    expect(
      registry.listTools({ permissionKeys: ['walletRead'] }).map((t) => t.name),
    ).toEqual(['wallet.read']);
    expect(
      registry.listTools({ permissionKeys: ['ride.read'] }).map((t) => t.name),
    ).toEqual(['ride.status']);
    expect(registry.listTools({ permissionKeys: ['nothing.granted'] })).toEqual(
      [],
    );
  });

  it('every registered tool has a well-formed JSON schema (type + object properties)', () => {
    const tools = defineTools('demo', [
      {
        name: 'echo',
        description: 'x',
        inputSchema: { type: 'object', properties: {} },
        permissionKey: 'demo.read',
        sensitive: false,
        defaultGranted: true,
        handler: async () => null,
      },
    ]);
    registry.registerMany(tools);
    for (const tool of registry.listTools()) {
      expect(tool.inputSchema.type).toBe('object');
      expect(typeof tool.inputSchema.properties).toBe('object');
    }
  });

  it('defineTools auto-namespaces bare names and stamps the module', () => {
    const tools = defineTools('wallet', [
      {
        name: 'read',
        description: 'x',
        inputSchema: { type: 'object' },
        permissionKey: 'wallet.read',
        sensitive: false,
        defaultGranted: true,
        handler: async () => null,
      },
      {
        name: 'other.already.dotted',
        description: 'x',
        inputSchema: { type: 'object' },
        permissionKey: 'wallet.read',
        sensitive: false,
        defaultGranted: true,
        handler: async () => null,
      },
    ]);
    expect(tools[0].name).toBe('wallet.read');
    expect(tools[0].module).toBe('wallet');
    expect(tools[1].name).toBe('other.already.dotted');
  });
});
