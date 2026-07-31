import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { StoryService } from './story.service';

@Injectable()
export class StoryAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private story: StoryService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('story', [
        {
          name: 'feed',
          description: "Read the user's story feed.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'story.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.story.getFeed(ctx.userId),
          describeResult: (_i, output: any[]) =>
            `${output.length} story group(s).`,
        },
        {
          name: 'delete',
          description: "Delete one of the user's own stories.",
          inputSchema: {
            type: 'object',
            properties: { storyId: { type: 'string' } },
            required: ['storyId'],
          },
          permissionKey: 'story.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.story.deleteStory(input.storyId, ctx.userId),
          describeResult: () => 'Story deleted.',
        },
        {
          name: 'trendingLabels',
          description:
            'See which "of the Day" labels (OOTD, COTD, etc.) are trending right now.',
          inputSchema: {
            type: 'object',
            properties: { days: { type: 'number' } },
          },
          permissionKey: 'story.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.story.getTrendingLabels(
              input?.days ? Number(input.days) : undefined,
            ),
          describeResult: (_i, output: any[]) =>
            `${output.length} trending label(s).`,
        },
      ]),
    );
  }
}
