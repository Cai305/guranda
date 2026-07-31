import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { PoolService } from './pool.service';

@Injectable()
export class PoolAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private pool: PoolService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('pool', [
        {
          name: 'myGame',
          description: 'Get the current state of a pool game by id.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'pool.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.pool.getGame(input.gameId),
        },
        {
          name: 'create',
          description:
            'Create a new 8-ball pool game, optionally with an MSH wager. Requires approval since a wager may be at stake.',
          inputSchema: {
            type: 'object',
            properties: {
              players: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    displayName: { type: 'string' },
                  },
                  required: ['userId', 'displayName'],
                },
              },
              wager: { type: 'number' },
            },
            required: ['players'],
          },
          permissionKey: 'pool.play',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.pool.createGame(
              input.players,
              ctx.userId,
              Number(input.wager) || 0,
            ),
          describeAction: (input) =>
            input.wager > 0
              ? `Create a pool game with a ${input.wager} MSH wager`
              : 'Create a pool game',
          describeResult: () => 'Pool game created.',
        },
      ]),
    );
  }
}
