import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { CardsService } from './cards.service';

@Injectable()
export class CardsAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private cards: CardsService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('cards', [
        {
          name: 'startFiveCardsVsAI',
          description: 'Start a 5 Cards game against an AI opponent.',
          inputSchema: {
            type: 'object',
            properties: {
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              jokersEnabled: { type: 'boolean' },
            },
          },
          permissionKey: 'cards.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.cards.startAIGame('FIVE_CARDS', ctx.userId, 'You', input?.difficulty ?? 'medium', {
              jokersEnabled: !!input?.jokersEnabled,
            }),
          describeResult: (_i, output: any) => `Started 5 Cards game ${output.id}.`,
        },
        {
          name: 'startCassinoVsAI',
          description: 'Start a Cassino game against an AI opponent.',
          inputSchema: {
            type: 'object',
            properties: {
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              targetScore: { type: 'number' },
            },
          },
          permissionKey: 'cards.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.cards.startAIGame('CASSINO', ctx.userId, 'You', input?.difficulty ?? 'medium', {
              cassinoMode: 'ONE_V_ONE',
              targetScore: input?.targetScore ?? 11,
            }),
          describeResult: (_i, output: any) => `Started Cassino game ${output.id}.`,
        },
        {
          name: 'fiveCardsDiscard',
          description: 'Discard a card in an active 5 Cards game (must have already drawn or taken the discard this turn).',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              suit: { type: 'string', enum: ['S', 'H', 'D', 'C'] },
              rank: { type: 'number' },
            },
            required: ['gameId', 'suit', 'rank'],
          },
          permissionKey: 'cards.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.cards.fiveCardsDiscard(input.gameId, ctx.userId, { suit: input.suit, rank: input.rank }),
          describeAction: (input) => `Discard ${input.rank} of ${input.suit} in game ${input.gameId}`,
          describeResult: () => 'Card discarded.',
        },
        {
          name: 'cassinoPlay',
          description: 'Play a card in an active Cassino game — capture, build, trail, extend or take over a build.',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              action: { type: 'string', enum: ['capture', 'build', 'trail', 'extendBuild', 'takeOverBuild'] },
              suit: { type: 'string', enum: ['S', 'H', 'D', 'C'] },
              rank: { type: 'number' },
              targetIds: { type: 'array', items: { type: 'string' } },
              buildValue: { type: 'number' },
            },
            required: ['gameId', 'action', 'suit', 'rank'],
          },
          permissionKey: 'cards.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.cards.cassinoPlay(
              input.gameId,
              ctx.userId,
              input.action,
              { suit: input.suit, rank: input.rank },
              input.targetIds ?? [],
              input.buildValue,
            ),
          describeAction: (input) => `${input.action} with ${input.rank} of ${input.suit} in game ${input.gameId}`,
          describeResult: () => 'Move played.',
        },
      ]),
    );
  }
}
