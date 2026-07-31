import { Injectable, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  LlmAdapter,
  RuntimeMessage,
  RuntimeTool,
  RuntimeTurnResult,
} from './llm-adapter.interface';

const MODEL = process.env.AI_MODEL || 'claude-opus-4-8';

// Anthropic tool names must match ^[a-zA-Z0-9_-]{1,128}$ — our registry uses
// dot-namespaced names (e.g. 'wallet.send'), so translate at this boundary
// only. The registry, executor, and everything else keep using dotted names.
const toAnthropicName = (name: string) => name.replace(/\./g, '__');
const fromAnthropicName = (name: string) => name.replace(/__/g, '.');

@Injectable()
export class AnthropicAdapter implements LlmAdapter {
  private client: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic();
    }
  }

  async runTurn({
    system,
    messages,
    tools,
    internetAccessGranted,
  }: {
    system: string;
    messages: RuntimeMessage[];
    tools: RuntimeTool[];
    internetAccessGranted?: boolean;
  }): Promise<RuntimeTurnResult> {
    if (!this.client) {
      throw new BadRequestException(
        'AI is not configured on this server: set ANTHROPIC_API_KEY in apps/api/.env and restart the API.',
      );
    }

    const anthropicMessages: Anthropic.MessageParam[] = messages.map(
      (m): Anthropic.MessageParam => {
        if (m.role === 'tool_result') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.toolCallId,
                content: m.content,
              },
            ],
          };
        }
        if (m.role === 'assistant' && m.toolCall) {
          const blocks: Anthropic.ContentBlockParam[] = [];
          if (m.content) blocks.push({ type: 'text', text: m.content });
          blocks.push({
            type: 'tool_use',
            id: m.toolCall.id,
            name: toAnthropicName(m.toolCall.name),
            input: m.toolCall.input,
          });
          return { role: 'assistant', content: blocks };
        }
        return { role: m.role, content: m.content };
      },
    );

    const anthropicTools: any[] = tools.map((t) => ({
      name: toAnthropicName(t.name),
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    // Anthropic's own hosted web search — runs server-side inline with the
    // turn (search + read results + synthesize, all before we see the
    // response), so it needs no handler in our Tool Registry at all. Not
    // in the SDK's TS types yet (older SDK version), hence the raw object.
    if (internetAccessGranted) {
      anthropicTools.push({
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      });
    }

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: [
          { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        ],
        tools: anthropicTools,
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        messages: anthropicMessages,
      });
    } catch (e: any) {
      if (e instanceof Anthropic.APIError) {
        throw new BadRequestException(`AI provider error: ${e.message}`);
      }
      throw e;
    }

    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    return {
      content,
      toolCalls: toolUse
        ? [
            {
              id: toolUse.id,
              name: fromAnthropicName(toolUse.name),
              input: toolUse.input,
            },
          ]
        : [],
      stopReason:
        response.stop_reason === 'tool_use'
          ? 'tool_use'
          : response.stop_reason === 'max_tokens'
            ? 'max_tokens'
            : response.stop_reason === 'end_turn'
              ? 'end_turn'
              : 'other',
    };
  }
}
