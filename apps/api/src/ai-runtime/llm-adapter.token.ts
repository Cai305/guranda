// DI token for the active LlmAdapter. To add another provider:
//   1. Create e.g. openai-adapter.ts implementing LlmAdapter.
//   2. In ai-runtime.module.ts, change `{ provide: LLM_ADAPTER, useClass: AnthropicAdapter }`
//      to point at the new class (or branch on an AI_PROVIDER env var).
// No other file in ai-runtime/, tool-registry/, or any *-ai-tools.provider.ts
// needs to change — they only ever depend on the LlmAdapter interface.
export const LLM_ADAPTER = Symbol('LLM_ADAPTER');
