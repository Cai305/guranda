import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { removeBackground } from '@imgly/background-removal-node';
import { JwtAuthGuard } from '../auth/auth.guard';
import { uploadToSupabase } from '../supabase.util';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

@UseGuards(JwtAuthGuard)
@Controller('editor')
export class EditorController {
  private readonly logger = new Logger(EditorController.name);

  constructor(
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
    private featureFlags: FeatureFlagsService,
  ) {}

  // Runs the segmentation model in-process (ONNX via @imgly/background-removal-node)
  // — no third-party API key, no per-call cost. First call in a process pays a
  // one-time model download/warm-up; subsequent calls reuse it.
  @Post('remove-background')
  async removeBackgroundEndpoint(@Body() body: { imageUrl?: string }) {
    const imageUrl = body?.imageUrl?.trim();
    if (!imageUrl) throw new BadRequestException('imageUrl is required');

    let blob: Blob;
    try {
      blob = await removeBackground(imageUrl, {
        model: 'medium',
        output: { format: 'image/png', quality: 1 },
      });
    } catch (e: any) {
      this.logger.error(`Background removal failed: ${e?.message ?? e}`);
      throw new BadRequestException('Could not process that image');
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const file = {
      buffer,
      mimetype: 'image/png',
      originalname: 'bg-removed.png',
    } as Express.Multer.File;
    const url = await uploadToSupabase('images', file);
    return { url };
  }

  /** Returns { suggestions: [] } on any failure or when AI is disabled — never blocks editing. */
  @Post('suggest-copy')
  async suggestCopy(@Body() body: { currentText?: string; context?: string }) {
    const access = await this.featureFlags.getAccess('ai');
    if (access === 'OFF') return { suggestions: [] };

    const currentText = (body?.currentText ?? '').slice(0, 300);
    const context = (body?.context ?? 'poster').slice(0, 80);

    const system = `You write short, punchy copy for social-media posters and graphics inside the Guranda app. The user is designing a "${context}" style poster. Given their current draft text (may be empty), propose exactly 3 alternative lines of copy that are punchier, clearer, or more on-brand — each under 60 characters, no quotation marks, no hashtags, no emoji. Always call propose_copy — never respond with plain text.`;
    const userMsg = currentText
      ? `Current text: "${currentText}"\nGive me 3 better alternatives.`
      : `I haven't written anything yet. Give me 3 strong opening lines for this poster.`;

    try {
      const result = await this.llm.runTurn({
        system,
        messages: [{ role: 'user', content: userMsg }],
        tools: [
          {
            name: 'propose_copy',
            description: 'Submit the 3 suggested lines of copy.',
            inputSchema: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 3,
                  maxItems: 3,
                },
              },
              required: ['suggestions'],
            },
          },
        ],
      });

      const call = result.toolCalls.find((c) => c.name === 'propose_copy');
      const raw = call?.input?.suggestions;
      if (!Array.isArray(raw)) return { suggestions: [] };
      return {
        suggestions: raw
          .filter((s: any) => typeof s === 'string' && s.trim())
          .slice(0, 3)
          .map((s: string) => s.trim().slice(0, 80)),
      };
    } catch (e: any) {
      this.logger.warn(`AI copy suggestion failed, skipping: ${e?.message ?? e}`);
      return { suggestions: [] };
    }
  }
}
