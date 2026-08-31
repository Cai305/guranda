import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their Slack workspace yet — suggest they connect it under Profile > External Apps.";

// Slack's Web API always returns HTTP 200 and signals failure via a JSON
// `ok: false` + `error` field instead of an HTTP status code — checked
// explicitly below rather than relying on `res.ok`.
@Injectable()
export class SlackAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'slack');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  private async call(token: string, method: string, body?: Record<string, unknown>) {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body || {}),
    });
    const data: any = await res.json();
    if (!res.ok || !data.ok) {
      throw new BadRequestException(data.error || `Slack request failed (${res.status}).`);
    }
    return data;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('slack', [
        {
          name: 'listChannels',
          description:
            "List channels in the user's connected Slack workspace (requires the user to have connected Slack in Guranda settings).",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'slack.listChannels',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx) => {
            const token = await this.accessToken(ctx.userId);
            const data = await this.call(token, 'conversations.list', { limit: 100 });
            return {
              channels: (data.channels || []).map((c: any) => ({ id: c.id, name: c.name, isPrivate: c.is_private })),
            };
          },
          describeResult: (_i, output: any) => {
            const channels = output?.channels ?? [];
            if (channels.length === 0) return 'No channels found.';
            return channels.map((c: any) => `#${c.name}`).join(', ');
          },
        },
        {
          name: 'postMessage',
          description: 'Post a message to a Slack channel in the user\'s connected workspace. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel name (e.g. "#general") or channel ID' },
              text: { type: 'string' },
            },
            required: ['channel', 'text'],
          },
          permissionKey: 'slack.postMessage',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Post to Slack ${input.channel}: "${input.text}"`,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const data = await this.call(token, 'chat.postMessage', { channel: input.channel, text: input.text });
            return { posted: true, ts: data.ts };
          },
          describeResult: (input) => `Posted to Slack ${input.channel}.`,
        },
      ]),
    );
  }
}
