import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  WIDGET_ACTION_CATALOG,
  ORDINAL_WORDS,
  WidgetActionKey,
} from '@mxit2/types';

export interface WidgetActionResolution {
  toolCallId: string;
  selectedIndex: number;
  action: WidgetActionKey;
  reply: string;
}

// Only 'next' | 'previous' | 'select' short-circuit the LLM loop — the rest
// of WIDGET_ACTION_CATALOG's vocabulary (compare/buy/save/share) still goes
// through the normal tool-calling path, since those need real domain logic
// (a comparison view, a purchase flow) that doesn't exist as a pure
// state-mutation yet. See packages/types's WIDGET_ACTION_CATALOG doc comment.

// A message must be short to short-circuit — this is a precision guard, not
// real NLU. "next" or "the second one" are unambiguous; a long sentence that
// happens to contain the word "next" ("next week's events in Cape Town")
// must NOT be hijacked as a widget action just because a widget is still
// active from an earlier search. Longer/ambiguous messages always fall
// through to the normal LLM loop.
const MAX_DISPATCH_WORDS = 6;

@Injectable()
export class WidgetActionResolverService {
  constructor(private prisma: PrismaService) {}

  /** Tries to resolve `message` as a direct action against the user's
   * currently-active widget. Returns null (never throws) whenever it can't
   * confidently resolve — the caller falls through to the normal LLM loop
   * in that case, so a wrong guess here can never break a real request. */
  async tryResolve(
    userId: string,
    message: string,
  ): Promise<WidgetActionResolution | null> {
    const text = message.trim().toLowerCase().replace(/[.!?]+$/, '');
    if (!text || text.split(/\s+/).length > MAX_DISPATCH_WORDS) return null;

    const session = await this.prisma.aiSession.findUnique({
      where: { userId },
    });
    if (
      !session?.activeWidgetToolCallId ||
      !session.activeWidgetRenderAs ||
      !session.activeWidgetItemCount
    ) {
      return null;
    }

    const spec = WIDGET_ACTION_CATALOG[session.activeWidgetRenderAs];
    if (!spec) return null;

    const itemCount = session.activeWidgetItemCount;
    const current = session.activeWidgetSelectedIndex ?? 0;
    const action = this.matchAction(text, spec.actions);
    if (!action) return null;

    let nextIndex: number;
    let reply: string;
    if (action === 'next') {
      if (itemCount < 2) return null;
      nextIndex = (current + 1) % itemCount;
      reply = "Here's the next one.";
    } else if (action === 'previous') {
      if (itemCount < 2) return null;
      nextIndex = (current - 1 + itemCount) % itemCount;
      reply = "Here's the previous one.";
    } else {
      const ordinal = this.matchOrdinal(text, itemCount);
      if (ordinal === null) return null;
      nextIndex = ordinal;
      reply = `Here's number ${nextIndex + 1}.`;
    }

    await this.prisma.aiSession.update({
      where: { userId },
      data: { activeWidgetSelectedIndex: nextIndex },
    });

    return {
      toolCallId: session.activeWidgetToolCallId,
      selectedIndex: nextIndex,
      action,
      reply,
    };
  }

  private matchAction(
    text: string,
    supported: WidgetActionKey[],
  ): 'next' | 'previous' | 'select' | null {
    for (const action of ['next', 'previous'] as const) {
      if (!supported.includes(action)) continue;
      const phrases =
        WIDGET_ACTION_CATALOG['product-list'].voicePhrases[action] || [];
      // Every list-shaped renderAs shares the same next/previous phrases
      // (see WIDGET_ACTION_CATALOG) — reading off 'product-list' here just
      // avoids re-deriving them per renderAs; the actual gate is `supported`.
      if (phrases.some((p) => text === p || text.includes(p))) return action;
    }
    if (supported.includes('select') && this.hasOrdinal(text)) return 'select';
    return null;
  }

  private hasOrdinal(text: string): boolean {
    if (/\b(?:number|item|#)\s*\d+\b/.test(text)) return true;
    return Object.keys(ORDINAL_WORDS).some((w) =>
      new RegExp(`\\b${w}\\b`).test(text),
    );
  }

  private matchOrdinal(text: string, itemCount: number): number | null {
    const numberMatch = text.match(/\b(?:number|item|#)\s*(\d+)\b/);
    if (numberMatch) {
      const idx = parseInt(numberMatch[1], 10) - 1;
      return idx >= 0 && idx < itemCount ? idx : null;
    }
    for (const [word, idx] of Object.entries(ORDINAL_WORDS)) {
      if (new RegExp(`\\b${word}\\b`).test(text)) {
        if (word === 'last') return itemCount - 1;
        return idx < itemCount ? idx : null;
      }
    }
    return null;
  }
}
