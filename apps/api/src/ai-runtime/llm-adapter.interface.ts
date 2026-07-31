// Provider-agnostic shapes. Nothing outside anthropic-adapter.ts (and future
// sibling adapters) should ever import from '@anthropic-ai/sdk' or any other
// provider SDK — that's the whole point of this layer: swapping OpenAI/
// Gemini/DeepSeek/etc. in later is a new file implementing LlmAdapter plus a
// one-line change in ai-runtime.module.ts, never a change to AgentRuntimeService,
// ActionExecutorService, or any tool handler.
import { JsonSchema } from '../tool-registry/tool-registry.types';

export interface RuntimeToolCall {
  id: string;
  name: string;
  input: any;
}

// A conversation is a flat array of these. Each adapter is responsible for
// translating this shape to/from its provider's native message format (e.g.
// Anthropic's content-block arrays, OpenAI's tool_calls/tool-role messages).
export type RuntimeMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCall?: RuntimeToolCall }
  | { role: 'tool_result'; toolCallId: string; content: string };

export interface RuntimeTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface RuntimeTurnResult {
  /** Any text the model produced this turn (may be empty if it went straight to a tool call). */
  content: string;
  /** At most one entry in this codebase's loop (tool_choice disables parallel calls), but modeled as an array for adapters that don't have that restriction. */
  toolCalls: RuntimeToolCall[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'other';
}

export interface LlmAdapter {
  runTurn(params: {
    system: string;
    messages: RuntimeMessage[];
    tools: RuntimeTool[];
    /**
     * The user has granted general internet-access permission (the
     * `internet.search` capability in AI settings) — NOT "use Anthropic's
     * web_search_20250305 tool" specifically. Each adapter decides HOW to
     * satisfy this: a hosted/native search tool if the provider has one
     * (e.g. AnthropicAdapter maps this to web_search_20250305), or simply
     * doing nothing, in which case the runtime's own registered
     * `internet.search`-style Tool Registry entry (if one exists) is what
     * actually gets called instead. Keeping this boolean provider-neutral
     * (a permission signal, not an Anthropic-shaped feature flag) is what
     * lets a future OpenAI/Gemini/etc. adapter interpret it sanely.
     */
    internetAccessGranted?: boolean;
  }): Promise<RuntimeTurnResult>;
}
