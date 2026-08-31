import { ToolDefinition } from '../tool-registry/tool-registry.types';

// MCP's tools/call is a single synchronous RPC — there's no native two-phase
// confirmation primitive a generic MCP host can be relied on to implement.
// Sensitive/write tools are still exposed (description is annotated so the
// calling LLM knows to expect a 'pending' result instead of an immediate
// one), but McpController parks the actual call in PendingMcpAction and
// requires the same real in-app approve/decline the chat surface uses
// before it runs — see mcp-pending-actions.service.ts.
export function toMcpTools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.sensitive
      ? `${t.description} Requires the user's in-app approval — calling this returns a pending action id; poll it with check_pending_action.`
      : t.description,
    inputSchema: t.inputSchema,
  }));
}
