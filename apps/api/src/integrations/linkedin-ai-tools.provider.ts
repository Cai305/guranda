import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their LinkedIn account yet — suggest they connect it under Profile > External Apps.";

// Real LinkedIn OpenID Connect userinfo endpoint
// (https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
// via the user's own OAuth token — see oauth-providers.ts's `linkedin`
// entry. Kept to a single read-only action: posting to LinkedIn
// (w_member_social scope) requires LinkedIn partner approval Guranda
// doesn't have, so it isn't included in this phase's scope.
@Injectable()
export class LinkedinAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'linkedin');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('linkedin', [
        {
          name: 'myProfile',
          description:
            "Get the user's own LinkedIn profile basics — name, headline photo, email (requires the user to have connected LinkedIn in Guranda settings).",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'linkedin.myProfile',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx) => {
            const token = await this.accessToken(ctx.userId);
            const res = await fetch('https://api.linkedin.com/v2/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data: any = await res.json();
            if (!res.ok) throw new BadRequestException(data.message || 'Failed to read LinkedIn profile.');
            return {
              name: data.name,
              email: data.email,
              pictureUrl: data.picture,
              locale: data.locale,
            };
          },
          describeResult: (_i, output: any) => `LinkedIn profile: ${output?.name || 'unknown'}.`,
        },
      ]),
    );
  }
}
