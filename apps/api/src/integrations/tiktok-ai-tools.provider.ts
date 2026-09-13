import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their TikTok account yet — suggest they connect it under Profile > External Apps.";

// Real TikTok Display API (https://developers.tiktok.com/doc/display-api-get-video-list/)
// via the user's own OAuth token — see oauth-providers.ts's `tiktok` entry
// and adapters/tiktok.adapter.ts for its OAuth token-exchange quirks.
@Injectable()
export class TiktokAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'tiktok');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('tiktok', [
        {
          name: 'listMyVideos',
          description:
            "List the user's own TikTok videos (requires the user to have connected their TikTok account in Guranda settings).",
          inputSchema: {
            type: 'object',
            properties: {
              maxResults: { type: 'number', description: 'How many videos to return (default 10, max 20)' },
            },
          },
          permissionKey: 'tiktok.listMyVideos',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const res = await fetch(
              'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,view_count,create_time',
              {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ max_count: Math.min(input.maxResults || 10, 20) }),
              },
            );
            const data: any = await res.json();
            if (!res.ok || data.error?.code !== 'ok') {
              throw new BadRequestException(data.error?.message || 'Failed to list TikTok videos.');
            }
            return {
              videos: (data.data?.videos || []).map((v: any) => ({
                id: v.id,
                title: v.title,
                shareUrl: v.share_url,
                viewCount: v.view_count,
                createdAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : undefined,
              })),
            };
          },
          describeResult: (_i, output: any) => {
            const videos = output?.videos ?? [];
            if (videos.length === 0) return 'No videos found.';
            return videos.map((v: any) => `"${v.title}" (${v.viewCount ?? 0} views)`).join('; ');
          },
        },
      ]),
    );
  }
}
