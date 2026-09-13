import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their X (Twitter) account yet — suggest they connect it under Profile > External Apps.";

// Real X API v2 (https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets)
// via the user's own OAuth token — see oauth-providers.ts's `x` entry and
// adapters/x.adapter.ts for its PKCE/Basic-auth OAuth quirks.
@Injectable()
export class XAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'x');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('x', [
        {
          name: 'postTweet',
          description:
            "Post a tweet from the user's connected X (Twitter) account (requires the user to have connected X in Guranda settings). Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Tweet text, max 280 characters' },
            },
            required: ['text'],
          },
          permissionKey: 'x.postTweet',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Post to X: "${input.text}"`,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const res = await fetch('https://api.x.com/2/tweets', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: input.text }),
            });
            const data: any = await res.json();
            if (!res.ok) {
              throw new BadRequestException(data.detail || data.title || 'Failed to post to X.');
            }
            return { posted: true, tweetId: data.data?.id };
          },
          describeResult: (input) => `Posted to X: "${input.text}"`,
        },
      ]),
    );
  }
}
