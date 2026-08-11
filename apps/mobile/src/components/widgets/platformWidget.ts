export type PlatformWidgetType =
  | 'product' | 'flight' | 'carHire' | 'hotel' | 'event' | 'itinerary'
  | 'game' | 'miniApp' | 'health' | 'challenge' | 'post' | 'property' | 'service';

export interface PlatformWidgetAction {
  label?: string;
  /** A screen name available to the current navigator. */
  screen?: string;
  params?: Record<string, unknown>;
}

/**
 * A small, serialisable content card.  It is deliberately storage-agnostic so
 * it can live in an AI response, a chat `content` field, or a comment body.
 */
export interface PlatformWidgetData {
  type: PlatformWidgetType;
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string | null;
  priceLabel?: string;
  badge?: string;
  meta?: string[];
  action?: PlatformWidgetAction;
}

const WIDGET_TAG = '__mxitWidget';

export function encodePlatformWidget(widget: PlatformWidgetData): string {
  return JSON.stringify({ [WIDGET_TAG]: 1, widget });
}

export function decodePlatformWidget(content?: string | null): PlatformWidgetData | null {
  if (!content || !content.includes(WIDGET_TAG)) return null;
  try {
    const parsed = JSON.parse(content);
    const widget = parsed?.[WIDGET_TAG] === 1 ? parsed.widget : null;
    if (!widget || typeof widget.title !== 'string' || typeof widget.type !== 'string') return null;
    return widget as PlatformWidgetData;
  } catch {
    return null;
  }
}
