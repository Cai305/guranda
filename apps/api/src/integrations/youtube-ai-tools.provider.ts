import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their YouTube account yet — suggest they connect it under Profile > External Apps.";

// Real YouTube Data API v3 (https://developers.google.com/youtube/v3/docs/search/list)
// via the user's own OAuth token — see oauth-providers.ts's `youtube` entry.
@Injectable()
export class YoutubeAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'youtube');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('youtube', [
        {
          name: 'searchVideos',
          description:
            "Search YouTube for videos (requires the user to have connected their YouTube account in Guranda settings).",
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search terms' },
              maxResults: { type: 'number', description: 'How many results to return (default 10, max 25)' },
            },
            required: ['query'],
          },
          permissionKey: 'youtube.searchVideos',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const params = new URLSearchParams({
              part: 'snippet',
              type: 'video',
              q: input.query,
              maxResults: String(Math.min(input.maxResults || 10, 25)),
            });
            const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data: any = await res.json();
            if (!res.ok) throw new BadRequestException(data.error?.message || 'Failed to search YouTube.');
            return {
              videos: (data.items || []).map((v: any) => ({
                videoId: v.id?.videoId,
                title: v.snippet?.title,
                channelTitle: v.snippet?.channelTitle,
                publishedAt: v.snippet?.publishedAt,
                thumbnailUrl: v.snippet?.thumbnails?.default?.url,
                url: v.id?.videoId ? `https://www.youtube.com/watch?v=${v.id.videoId}` : undefined,
              })),
            };
          },
          describeResult: (_i, output: any) => {
            const videos = output?.videos ?? [];
            if (videos.length === 0) return 'No videos found.';
            return videos.map((v: any) => `"${v.title}" (${v.channelTitle})`).join('; ');
          },
        },
      ]),
    );
  }
}
