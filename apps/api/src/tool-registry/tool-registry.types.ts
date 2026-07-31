// The unit of AI capability. Every module registers its functionality as one
// or more ToolDefinitions instead of the app relying on hand-written per-tool
// switch statements (the old apps/api/src/ai/ai.service.ts approach). Shape
// is JSON-Schema based so it maps cleanly onto both LLM function-calling
// tool formats (Anthropic/OpenAI/Gemini) and the Model Context Protocol.

export interface ToolContext {
  userId: string;
}

export interface JsonSchema {
  type: string;
  properties?: Record<
    string,
    JsonSchema | { type: string; description?: string; enum?: any[] }
  >;
  required?: string[];
  description?: string;
  [key: string]: any;
}

export interface ToolDefinition {
  /** Unique, dot-namespaced: '<module>.<action>', e.g. 'wallet.send'. */
  name: string;
  /** Shown to the LLM (and, for non-sensitive tools, to MCP clients) to decide when to call this tool. */
  description: string;
  /** JSON Schema for the tool's input. */
  inputSchema: JsonSchema;
  /** Permission key checked against AiAgent.permissions before this tool may run. */
  permissionKey: string;
  /** Older permission keys (pre-registry) that should also satisfy this tool's gate, so existing AiAgent rows keep working with no data migration. */
  legacyAliases?: string[];
  /** True = this tool mutates state/spends money/etc. and must be user-approved before executing (never auto-run). */
  sensitive: boolean;
  /** Owning module, for grouping/filtering (e.g. mobile's AiAccessScreen groups tools by module). */
  module: string;
  /** Whether AiAccessScreen should default this permission to ON for a newly-created agent. */
  defaultGranted: boolean;
  /** The real implementation — must call into the module's existing service, never reimplement its logic. */
  handler: (ctx: ToolContext, input: any) => Promise<any>;
  /** Human-facing summary for the approval card. Only relevant when sensitive=true. */
  describeAction?: (input: any) => string;
  /** LLM-facing tool_result text. Defaults to JSON.stringify(output). */
  describeResult?: (input: any, output: any) => string;
  /** If true, ActionExecutorService runs this without awaiting inline (see action-executor.service.ts). Not exercised by any flagship tool yet — scaffolding for future long-running tools. */
  backgroundCapable?: boolean;
  /** If set, the client renders this tool's structured output as a widget of this type (e.g. 'product-list') instead of plain text only. Free-form string, not an enum — new widget types are added by tagging a tool, no central registry to update. */
  renderAs?: string;
}

export interface ToolListFilter {
  module?: string;
  /** Only tools whose permissionKey (or a legacy alias) is in this set. */
  permissionKeys?: string[];
}
