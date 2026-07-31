import { ToolDefinition } from '../tool-registry/tool-registry.types';

// MCP's tools/call is a single synchronous RPC — there's no native two-phase
// confirmation primitive a generic MCP host can be relied on to implement.
// Rather than fake one (untested against real MCP hosts), sensitive/action
// tools are excluded from the MCP surface entirely this pass: they stay
// chat-only, gated by the app's own approve/decline UI. Known limitation,
// not silently papered over.
export function toMcpTools(tools: ToolDefinition[]) {
  return tools
    .filter((t) => !t.sensitive)
    .map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
}
