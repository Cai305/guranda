import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InteractionEngineService } from '../ai-runtime/interaction-engine.service';
import type { RuntimeMessage } from '../ai-runtime/llm-adapter.interface';

interface AskBody {
  message?: string;
  history?: { role?: string; content?: string }[];
}

@Controller('assistant')
export class AssistantController {
  constructor(private interactionEngine: InteractionEngineService) {}

  // Public, unauthenticated — this is the marketing website's FAQ chat
  // widget. Routed through InteractionEngineService's 'website' persona,
  // which has no user identity, no tool access, and no wallet/account
  // context: it can only talk, never act (see interaction-engine.service.ts
  // for why this trust boundary stays a hard branch there). Tighter
  // throttle than the app-wide default since each call is a real LLM request.
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('ask')
  async ask(@Body() body: AskBody) {
    const history: RuntimeMessage[] = Array.isArray(body?.history)
      ? body.history
          .filter((m): m is { role: string; content: string } => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : [];

    const result = await this.interactionEngine.handle({
      source: 'text',
      persona: 'website',
      message: body?.message,
      history,
    });
    return { reply: result.reply };
  }
}
