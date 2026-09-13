// The formal counterpart to ToolRegistryService (see
// ../tool-registry/tool-registry.types.ts). Until now, "what widget types
// exist" only lived implicitly as a switch(renderAs) in the mobile client's
// AiWidgetRenderer.tsx — this is the same registry pattern the Action
// Registry already uses, applied to the render side, so a future Feature
// Builder / Blueprint step editor can query "what widgets exist" instead of
// the mapping being hardcoded client-side only.

export interface WidgetDefinition {
  /** Unique id — always equal to the ToolDefinition.renderAs string it corresponds to (e.g. 'product-list'). */
  id: string;
  /** Same string as `id` — kept as its own field so a consumer that only has a renderAs string (not a WidgetDefinition) can look one up by the field name it actually holds. */
  renderAs: string;
  /** Human-facing summary of what this widget shows and when a tool should tag itself with it. */
  description: string;
  /** JSON Schema for the shape of `ToolWidget.data` (apps/mobile/src/components/ai-widgets/AiWidgetRenderer.tsx) this widget type expects to render. */
  inputSchema: Record<string, unknown>;
}
