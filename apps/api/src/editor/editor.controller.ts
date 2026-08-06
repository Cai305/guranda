import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/auth.guard';
import { uploadToSupabase } from '../supabase.util';
import { LLM_ADAPTER } from '../ai-runtime/llm-adapter.token';
import type { LlmAdapter } from '../ai-runtime/llm-adapter.interface';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

const execFileAsync = promisify(execFile);
// dist/editor/editor.controller.js -> apps/api/scripts/bg-removal-worker.js
const BG_REMOVAL_WORKER = join(__dirname, '..', '..', 'scripts', 'bg-removal-worker.js');

@UseGuards(JwtAuthGuard)
@Controller('editor')
export class EditorController {
  private readonly logger = new Logger(EditorController.name);

  constructor(
    @Inject(LLM_ADAPTER) private llm: LlmAdapter,
    private featureFlags: FeatureFlagsService,
  ) {}

  // Runs the segmentation model (ONNX via @imgly/background-removal-node) in
  // a dedicated child process — no third-party API key, no per-call cost.
  // Deliberately NOT imported/run in this process: it pulls in
  // onnxruntime-node + sharp, both native addons whose bundled OpenSSL/libvips
  // collide with Prisma's own native query engine when loaded into the same
  // process, breaking every DB TLS connection. See bg-removal-worker.js.
  @Post('remove-background')
  async removeBackgroundEndpoint(@Body() body: { imageUrl?: string }) {
    const imageUrl = body?.imageUrl?.trim();
    if (!imageUrl) throw new BadRequestException('imageUrl is required');

    let stdout: Buffer;
    try {
      const result = await execFileAsync('node', [BG_REMOVAL_WORKER, imageUrl], {
        encoding: 'buffer',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 60_000,
      });
      stdout = result.stdout as unknown as Buffer;
    } catch (e: any) {
      this.logger.error(`Background removal failed: ${e?.stderr?.toString?.() ?? e?.message ?? e}`);
      throw new BadRequestException('Could not process that image');
    }

    const file = {
      buffer: stdout,
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
