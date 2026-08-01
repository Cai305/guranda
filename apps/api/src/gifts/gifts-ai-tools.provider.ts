import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { GiftsService } from './gifts.service';

@Injectable()
export class GiftsAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private gifts: GiftsService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('gifts', [
        {
          name: 'catalog',
          description: 'List the available gift types and their MSH cost.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'gifts.read',
          sensitive: false,
          defaultGranted: true,
          handler: async () => this.gifts.catalog(),
        },
        {
          name: 'sent',
          description: 'List gifts the user has sent.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'gifts.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.gifts.sentByMe(ctx.userId),
          describeResult: (_i, output: any[]) =>
            `${output.length} gift(s) sent.`,
        },
        {
          name: 'received',
          description: 'List gifts the user has received.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'gifts.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.gifts.receivedByMe(ctx.userId),
          describeResult: (_i, output: any[]) =>
            `${output.length} gift(s) received.`,
        },
        {
          name: 'stats',
          description: 'Summary stats of gifts the user has sent/received.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'gifts.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.gifts.statsForUser(ctx.userId),
        },
        {
          name: 'send',
          description:
            'Send a gift (spends MSH) to another user, in the context of a Live stream, game, Discovery video, or Story (call gifts.catalog first to see valid giftType keys). For "video"/"story" context, contextId (the video or story id) is required and recipientId must be that content\'s actual creator/owner. Requires the account to be verified. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              recipientId: { type: 'string' },
              giftType: {
                type: 'string',
                description:
                  'One of the catalog keys, e.g. rose, heart, confetti, trophy, diamond, rocket',
              },
              context: { type: 'string', enum: ['live', 'game', 'video', 'story'] },
              contextId: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['recipientId', 'giftType', 'context'],
          },
          permissionKey: 'gifts.send',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.gifts.sendGift(ctx.userId, input),
          describeAction: (input) =>
            `Send a ${input.giftType} gift to ${input.recipientId}`,
          describeResult: () => 'Gift sent.',
        },
      ]),
    );
  }
}
