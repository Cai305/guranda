import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { AdsService } from './ads.service';

@Injectable()
export class AdsAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private ads: AdsService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('ads', [
        {
          name: 'myCampaigns',
          description:
            "List the user's own ad campaigns and their status/impressions.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'ads.manage',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.ads.listMine(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No ad campaigns yet.'
              : output
                  .map(
                    (c) =>
                      `"${c.title}" — ${c.status}, ${c.impressions} impressions`,
                  )
                  .join('\n'),
        },
        {
          name: 'createCampaign',
          description:
            'Create a new ad campaign with a title and creative image URL.',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              creativeUrl: { type: 'string' },
              targetAudience: { type: 'string' },
            },
            required: ['title', 'creativeUrl'],
          },
          permissionKey: 'ads.manage',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) => this.ads.createCampaign(ctx.userId, input),
          describeResult: (input) => `Created ad campaign "${input.title}".`,
        },
        {
          name: 'setCampaignStatus',
          description:
            "Pause, resume, or end one of the user's own ad campaigns.",
          inputSchema: {
            type: 'object',
            properties: {
              campaignId: { type: 'string' },
              status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ENDED'] },
            },
            required: ['campaignId', 'status'],
          },
          permissionKey: 'ads.manage',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.ads.setStatus(ctx.userId, input.campaignId, input.status),
          describeResult: (input) => `Campaign status set to ${input.status}.`,
        },
      ]),
    );
  }
}
