import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their Facebook account yet — suggest they connect it under Profile > External Apps.";

// Real Facebook Graph API /me call via the user's own OAuth token — see
// oauth-providers.ts's `facebook` entry. Kept to a single read-only action:
// the 'public_profile,email' scope this dev-mode app requests doesn't grant
// posting (that needs 'pages_manage_posts' + Meta App Review, which
// Guranda hasn't gone through), so posting actions are deliberately not
// included in this phase's scope.
@Injectable()
export class FacebookAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'facebook');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('facebook', [
        {
          name: 'getProfile',
          description:
            "Get the user's own Facebook profile basics — name, id, email if granted (requires the user to have connected Facebook in Guranda settings). Read-only: this app's scope doesn't permit posting on the user's behalf.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'facebook.getProfile',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx) => {
            const token = await this.accessToken(ctx.userId);
            const res = await fetch(
              `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${encodeURIComponent(token)}`,
            );
            const data: any = await res.json();
            if (!res.ok || data.error) {
              throw new BadRequestException(data.error?.message || 'Failed to read Facebook profile.');
            }
            return {
              id: data.id,
              name: data.name,
              email: data.email ?? null,
            };
          },
          describeResult: (_i, output: any) => `Facebook profile: ${output?.name || 'unknown'}.`,
        },
      ]),
    );
  }
}
