import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { ChallengeCategory, ChallengeType } from '@prisma/client';

export interface GeneratedChallenge {
  title: string;
  description: string;
  promptText?: string;
  category: ChallengeCategory;
  type: ChallengeType;
  xpReward: number;
  bonusXpReward: number;
}

const CATEGORIES = Object.values(ChallengeCategory);
const TYPES = Object.values(ChallengeType);

// One-shot structured generation — deliberately NOT going through
// AgentRuntimeService/CompanionChatService (both assume a live chat session
// with an AiAgent row) or the tool-registry/action-executor machinery (that's
// for user-approved app-mutating actions). This calls LlmAdapter.runTurn()
// directly with a single throwaway tool schema and reads the structured
// tool-call input back — the first non-chat AI usage in this codebase.
@Injectable()
export class ChallengeGeneratorService {
  private readonly logger = new Logger(ChallengeGeneratorService.name);

  constructor(
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
    private featureFlags: FeatureFlagsService,
  ) {}

  /** Returns [] on any failure (no API key, flag off, provider error, malformed response) — callers must treat this as a soft no-op, not an error. */
  async generate(count = 5, categories?: ChallengeCategory[]): Promise<GeneratedChallenge[]> {
    const access = await this.featureFlags.getAccess('ai');
    if (access === 'OFF') {
      this.logger.log('AI challenge generation skipped — "ai" feature flag is OFF');
      return [];
    }

    const targetCategories = categories?.length ? categories : CATEGORIES;
    const system = `You are curating short, fun, achievable social-media style challenges for the Guranda app. Categories: ${CATEGORIES.join(', ')}. Types: ${TYPES.join(', ')} (DAILY ~24h, FLASH 1-3h, WEEKEND, SEASONAL, SPONSORED). Generate ${count} distinct challenge ideas, prioritizing these categories: ${targetCategories.join(', ')}. Each needs a punchy title (<=80 chars), a one-paragraph description of what to submit, an optional short promptText hook, a category, a type, and xpReward (30-100) plus bonusXpReward (60-200) for the eventual winner. Always call propose_challenges with your ideas — never respond with plain text.`;

    try {
      const result = await this.llm.runTurn({
        system,
        messages: [{ role: 'user', content: `Generate ${count} new challenges now.` }],
        tools: [
          {
            name: 'propose_challenges',
            description: 'Submit the generated list of challenge ideas.',
            inputSchema: {
              type: 'object',
              properties: {
                challenges: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      promptText: { type: 'string' },
                      category: { type: 'string', enum: CATEGORIES },
                      type: { type: 'string', enum: TYPES },
                      xpReward: { type: 'number' },
                      bonusXpReward: { type: 'number' },
                    },
                    required: ['title', 'description', 'category', 'type', 'xpReward', 'bonusXpReward'],
                  },
                },
              },
              required: ['challenges'],
            },
          },
        ],
      });

      const call = result.toolCalls.find((c) => c.name === 'propose_challenges');
      const raw = call?.input?.challenges;
      if (!Array.isArray(raw)) {
        this.logger.warn('AI generation returned no structured challenge list — skipping this run');
        return [];
      }

      return raw
        .filter((c: any) => CATEGORIES.includes(c.category) && TYPES.includes(c.type) && c.title && c.description)
        .map((c: any) => ({
          title: String(c.title).slice(0, 150),
          description: String(c.description).slice(0, 2000),
          promptText: c.promptText ? String(c.promptText).slice(0, 500) : undefined,
          category: c.category,
          type: c.type,
          xpReward: Number.isFinite(c.xpReward) ? Math.max(0, Math.round(c.xpReward)) : 50,
          bonusXpReward: Number.isFinite(c.bonusXpReward) ? Math.max(0, Math.round(c.bonusXpReward)) : 100,
        }));
    } catch (e: any) {
      // Matches AnthropicAdapter's own graceful-degradation contract (throws
      // BadRequestException when ANTHROPIC_API_KEY isn't set) — a cron/admin
      // trigger should never crash because AI simply isn't configured.
      this.logger.warn(`AI challenge generation failed, skipping: ${e.message ?? e}`);
      return [];
    }
  }
}
