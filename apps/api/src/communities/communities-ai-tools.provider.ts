import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { CommunitiesService } from './communities.service';

@Injectable()
export class CommunitiesAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private communities: CommunitiesService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('communities', [
        {
          name: 'list',
          description: 'Browse all communities.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'communities.read',
          sensitive: false,
          defaultGranted: true,
          handler: () => this.communities.findAll(),
        },
        {
          name: 'mine',
          description: 'List the communities the user is a member of.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'communities.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.communities.findUserCommunities(ctx.userId),
        },
        {
          name: 'details',
          description: 'Get details for a specific community.',
          inputSchema: {
            type: 'object',
            properties: { communityId: { type: 'string' } },
            required: ['communityId'],
          },
          permissionKey: 'communities.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.communities.getCommunityDetails(input.communityId, ctx.userId),
        },
        {
          name: 'join',
          description: 'Join a community.',
          inputSchema: {
            type: 'object',
            properties: { communityId: { type: 'string' } },
            required: ['communityId'],
          },
          permissionKey: 'communities.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.communities.joinCommunity(ctx.userId, input.communityId),
          describeResult: () => 'Joined community.',
        },
        {
          name: 'create',
          description: 'Create a new community.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              iconUrl: { type: 'string' },
            },
            required: ['name'],
          },
          permissionKey: 'communities.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.communities.createCommunity(
              ctx.userId,
              input.name,
              input.description,
              input.iconUrl,
            ),
          describeResult: (input) => `Created community "${input.name}".`,
        },
      ]),
    );
  }
}
