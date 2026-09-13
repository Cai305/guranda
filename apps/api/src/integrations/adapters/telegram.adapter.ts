import { BadRequestException } from '@nestjs/common';

// Telegram bot integration is NOT OAuth2 — there's no authorize redirect, no
// app-level client id/secret, no user consent screen. A Telegram bot is
// created once via @BotFather inside Telegram itself, which hands back a
// single long-lived bot token (shape "123456789:AAExampleTokenTextHere").
// The user pastes that token into Guranda directly (see
// IntegrationsService.connectTelegram / ConnectedAppsScreen's Telegram
// card); this file hits Telegram's real getMe endpoint to prove the token
// actually works BEFORE it's ever saved as "connected" — a bad/fake token
// must fail loudly here, not save silently.
//
// Because there's no app-level credential at all, Telegram's real gating
// env var is INTEGRATIONS_ENCRYPTION_KEY (needed to store the token safely)
// — not a TELEGRAM_* client id/secret, which wouldn't mean anything for a
// bot-token integration. See connectors.service.ts's `computeConfigured`
// for telegram.

export interface TelegramBotIdentity {
  botId: number;
  username: string;
  firstName: string;
}

const TOKEN_SHAPE = /^\d+:[\w-]{20,}$/;

export async function verifyTelegramBotToken(botToken: string): Promise<TelegramBotIdentity> {
  const trimmed = (botToken || '').trim();
  if (!TOKEN_SHAPE.test(trimmed)) {
    throw new BadRequestException(
      "That doesn't look like a Telegram bot token — get one from @BotFather in Telegram (send it /newbot) and paste it here, e.g. \"123456789:AA...\".",
    );
  }
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${trimmed}/getMe`);
  } catch (e: any) {
    throw new BadRequestException(`Couldn't reach Telegram's API to verify this token: ${e.message || 'network error'}.`);
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new BadRequestException(
      `Telegram rejected this bot token: ${data.description || `HTTP ${res.status}`}. Double-check you copied it exactly from @BotFather.`,
    );
  }
  return {
    botId: data.result.id,
    username: data.result.username,
    firstName: data.result.first_name,
  };
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ messageId: number }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new BadRequestException(`Failed to send Telegram message: ${data.description || `HTTP ${res.status}`}`);
  }
  return { messageId: data.result.message_id };
}

export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoUrl: string,
  caption?: string,
): Promise<{ messageId: number }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new BadRequestException(`Failed to send Telegram photo: ${data.description || `HTTP ${res.status}`}`);
  }
  return { messageId: data.result.message_id };
}

export async function sendTelegramDocument(
  botToken: string,
  chatId: string,
  documentUrl: string,
  caption?: string,
): Promise<{ messageId: number }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, document: documentUrl, caption }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new BadRequestException(`Failed to send Telegram document: ${data.description || `HTTP ${res.status}`}`);
  }
  return { messageId: data.result.message_id };
}

export interface TelegramUpdateSummary {
  updateId: number;
  chatId: number;
  chatType: string;
  fromUsername: string | null;
  fromFirstName: string | null;
  text: string | null;
  date: number; // unix seconds, as returned by Telegram
}

// Real Bot API getUpdates long-poll — the only way a bot "receives" messages
// without standing up a public webhook (not realistic for local dev; see
// module doc comment). Passing `offset` = last processed update_id + 1 tells
// Telegram those updates have been consumed and it can stop returning them
// — the poller (telegram-poll.service.ts) always advances it; an on-demand
// caller that wants to peek without consuming should pass no offset (or the
// last CONFIRMED offset), never an offset past what it has durably stored.
export async function getTelegramUpdates(
  botToken: string,
  offset?: number,
): Promise<TelegramUpdateSummary[]> {
  const params = new URLSearchParams({ timeout: '0', limit: '50' });
  if (offset !== undefined) params.set('offset', String(offset));
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?${params.toString()}`);
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new BadRequestException(`Failed to fetch Telegram updates: ${data.description || `HTTP ${res.status}`}`);
  }
  const results: any[] = data.result || [];
  return results
    .filter((u) => u.message) // ignore edited_message/channel_post/etc for this phase — plain incoming messages only
    .map((u) => ({
      updateId: u.update_id,
      chatId: u.message.chat.id,
      chatType: u.message.chat.type,
      fromUsername: u.message.from?.username ?? null,
      fromFirstName: u.message.from?.first_name ?? null,
      text: u.message.text ?? (u.message.caption ?? null),
      date: u.message.date,
    }));
}
