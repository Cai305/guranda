import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { LudoService } from './ludo.service';

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
export class LudoAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private ludo: LudoService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('ludo', [
        {
          name: 'myGame',
          description: 'Get the current state of a Ludo game by id.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'ludo.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.ludo.getGame(input.gameId),
        },
        {
          name: 'rollDice',
          description: 'Roll the dice on your turn in a Ludo game.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'ludo.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) => this.ludo.rollDice(input.gameId, ctx.userId),
          describeResult: () => 'Dice rolled.',
        },
        {
          name: 'create',
          description:
            'Create a new Ludo game with the given mode (e.g. 1v1, 2v2, 4-player) and seats.',
          inputSchema: {
            type: 'object',
            properties: { mode: { type: 'string' }, players: SEAT_SCHEMA },
            required: ['mode', 'players'],
          },
          permissionKey: 'ludo.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.ludo.createGame(input.mode, input.players, ctx.userId),
          describeResult: () => 'Ludo game created.',
        },
        {
          name: 'move',
          description: 'Move a token in an ongoing Ludo game.',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              tokenIndex: { type: 'number' },
            },
            required: ['gameId', 'tokenIndex'],
          },
          permissionKey: 'ludo.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.ludo.moveToken(
              input.gameId,
              ctx.userId,
              Number(input.tokenIndex),
            ),
          describeResult: () => 'Token moved.',
        },
      ]),
    );
  }
}
