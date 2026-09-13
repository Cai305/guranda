import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramDocument,
  getTelegramUpdates,
  verifyTelegramBotToken,
} from './adapters/telegram.adapter';

const NOT_CONNECTED =
  "The user hasn't connected a Telegram bot yet — suggest they connect one under Profile > External Apps by pasting a bot token from @BotFather.";

// Telegram bot integration (bot token, not OAuth2 — see
// adapters/telegram.adapter.ts and IntegrationsService.connectTelegram).
//
// Phase 6: expanded from Phase 5's single sendMessage scaffolding action to
// a genuinely usable action set — still scoped to what a Bot API bot token
// actually grants (a bot can only see/act in chats it's been added to or
// that have messaged it first, never a user's full personal chat history;
// there is no MTProto personal-account client here, deliberately).
@Injectable()
export class TelegramAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async botToken(userId: string): Promise<string> {
    const token = await this.integrations.getTelegramBotToken(userId);
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('telegram', [
        {
          name: 'sendMessage',
          description:
            "Send a message through the user's connected Telegram bot to a specific chat (requires the user to have connected a Telegram bot in Guranda settings, and the recipient to have already started a chat with that bot). Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              chatId: {
                type: 'string',
                description: 'Telegram chat ID (or @username for a public channel the bot can post to) to send to',
              },
              text: { type: 'string' },
            },
            required: ['chatId', 'text'],
          },
          permissionKey: 'telegram.sendMessage',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Send a Telegram message to ${input.chatId}: "${input.text}"`,
          // Hybrid n8n orchestration migration (first tool moved): this call
          // now leaves the process and goes out through n8n's real
          // "Gateway - Telegram Send Message" workflow to Telegram's own
          // sendMessage API, instead of calling sendTelegramMessage()
          // in-process below. See automation-gateway/automation-gateway.service.ts
          // and action-executor.service.ts's runViaGateway for the real
          // routing — ActionExecutorService checks this flag and, when set,
          // never calls `handler` at all for this tool.
          executesVia: 'n8n',
          // Only consulted because executesVia is 'n8n' above (see
          // ToolDefinition.buildGatewayPayload doc comment) — merges the
          // user's real decrypted bot token into the payload actually sent
          // to n8n. The token never appears in `input`/inputSchema (never
          // shown to the LLM), and is redacted before AutomationGatewayService
          // persists the WorkflowExecution audit row.
          buildGatewayPayload: async (ctx, input) => {
            const token = await this.botToken(ctx.userId);
            return { botToken: token, chatId: input.chatId, text: input.text };
          },
          // Unused while executesVia: 'n8n' is set above — ActionExecutorService's
          // n8n branch calls buildGatewayPayload + AutomationGatewayService.trigger
          // instead of this handler (see runViaGateway in action-executor.service.ts).
          // Kept, not deleted: it's the exact in-process fallback this tool used
          // before the n8n migration and documents what executesVia would need to
          // revert to if 'n8n' were ever removed for this tool — still
          // type-checked and still callable directly (e.g. by tests) even though
          // the normal execution path never reaches it.
          handler: async (ctx, input) => {
            const token = await this.botToken(ctx.userId);
            const result = await sendTelegramMessage(token, input.chatId, input.text);
            return { sent: true, messageId: result.messageId };
          },
          describeResult: (input) => `Sent a Telegram message to ${input.chatId}.`,
        },
        {
          name: 'getMe',
          description:
            "Check the identity of the user's connected Telegram bot (live call to Telegram's own getMe endpoint) — useful to confirm the connection is genuinely working.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'telegram.read',
          sensitive: false,
          defaultGranted: true,
          handler: async (ctx) => {
            const token = await this.botToken(ctx.userId);
            return verifyTelegramBotToken(token);
          },
          describeResult: (_i, output) => `Bot identity: @${output.username} (${output.firstName}).`,
        },
        {
          name: 'getUpdates',
          description:
            "Fetch recent messages sent TO the user's connected Telegram bot (this is how a bot 'receives' messages via the Bot API — only messages from chats that have already messaged the bot or added it, not the user's full personal Telegram history).",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'telegram.read',
          sensitive: false,
          defaultGranted: true,
          handler: async (ctx) => {
            const token = await this.botToken(ctx.userId);
            // Deliberately no offset here — a read-only peek that doesn't
            // consume/advance Telegram's queue, so it never races with the
            // background poller's own confirmed-offset tracking (see
            // telegram-poll.service.ts).
            return getTelegramUpdates(token);
          },
          describeResult: (_i, output) => `${output.length} recent Telegram update(s).`,
        },
        {
          name: 'sendPhoto',
          description:
            "Send a photo (by URL) through the user's connected Telegram bot to a specific chat. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              chatId: { type: 'string', description: 'Telegram chat ID (or @username) to send to' },
              mediaUrl: { type: 'string', description: 'Publicly reachable URL of the photo to send' },
              caption: { type: 'string' },
            },
            required: ['chatId', 'mediaUrl'],
          },
          permissionKey: 'telegram.sendMessage',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Send a Telegram photo to ${input.chatId}`,
          handler: async (ctx, input) => {
            const token = await this.botToken(ctx.userId);
            const result = await sendTelegramPhoto(token, input.chatId, input.mediaUrl, input.caption);
            return { sent: true, messageId: result.messageId };
          },
          describeResult: (input) => `Sent a Telegram photo to ${input.chatId}.`,
        },
        {
          name: 'sendDocument',
          description:
            "Send a document/file (by URL) through the user's connected Telegram bot to a specific chat. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              chatId: { type: 'string', description: 'Telegram chat ID (or @username) to send to' },
              mediaUrl: { type: 'string', description: 'Publicly reachable URL of the document to send' },
              caption: { type: 'string' },
            },
            required: ['chatId', 'mediaUrl'],
          },
          permissionKey: 'telegram.sendMessage',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Send a Telegram document to ${input.chatId}`,
          handler: async (ctx, input) => {
            const token = await this.botToken(ctx.userId);
            const result = await sendTelegramDocument(token, input.chatId, input.mediaUrl, input.caption);
            return { sent: true, messageId: result.messageId };
          },
          describeResult: (input) => `Sent a Telegram document to ${input.chatId}.`,
        },
      ]),
    );
  }
}
