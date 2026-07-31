import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { MurabarabaService } from './murabaraba.service';

const SEAT_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      displayName: { type: 'string' },
      isAI: { type: 'boolean' },
    },
    required: ['displayName', 'isAI'],
  },
};

@Injectable()
export class MurabarabaAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private murabaraba: MurabarabaService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('murabaraba', [
        {
          name: 'myGame',
          description: 'Get the current state of a Murabaraba game by id.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'murabaraba.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.murabaraba.getGame(input.gameId),
        },
        {
          name: 'create',
          description: 'Create a new Murabaraba (cows) game.',
          inputSchema: {
            type: 'object',
            properties: { mode: { type: 'string' }, players: SEAT_SCHEMA },
            required: ['mode', 'players'],
          },
          permissionKey: 'murabaraba.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.murabaraba.createGame(input.mode, input.players, ctx.userId),
          describeResult: () => 'Murabaraba game created.',
        },
        {
          name: 'place',
          description:
            'Place a cow during the placement phase of a Murabaraba game.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' }, to: { type: 'number' } },
            required: ['gameId', 'to'],
          },
          permissionKey: 'murabaraba.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.murabaraba.place(input.gameId, ctx.userId, Number(input.to)),
          describeResult: () => 'Cow placed.',
        },
        {
          name: 'move',
          description:
            'Move a cow during the movement phase of a Murabaraba game.',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              from: { type: 'number' },
              to: { type: 'number' },
            },
            required: ['gameId', 'from', 'to'],
          },
          permissionKey: 'murabaraba.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.murabaraba.move(
              input.gameId,
              ctx.userId,
              Number(input.from),
              Number(input.to),
            ),
          describeResult: () => 'Cow moved.',
        },
        {
          name: 'shoot',
          description:
            "Shoot (capture) an opponent's cow after forming a mill in a Murabaraba game.",
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' }, at: { type: 'number' } },
            required: ['gameId', 'at'],
          },
          permissionKey: 'murabaraba.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.murabaraba.shoot(input.gameId, ctx.userId, Number(input.at)),
          describeResult: () => 'Cow captured.',
        },
      ]),
    );
  }
}
