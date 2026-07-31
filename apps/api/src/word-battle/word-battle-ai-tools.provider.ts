import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { WordBattleService } from './word-battle.service';

const SEAT_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      displayName: { type: 'string' },
      isAI: { type: 'boolean' },
      difficulty: { type: 'string' },
    },
    required: ['displayName', 'isAI'],
  },
};

@Injectable()
export class WordBattleAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private wordBattle: WordBattleService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('wordBattle', [
        {
          name: 'myGame',
          description: 'Get the current state of a Word Battle game by id.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'wordBattle.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.wordBattle.getGame(input.gameId),
        },
        {
          name: 'create',
          description:
            'Create a new Word Battle game (Wordle Duel, Boggle, or Scrabble mode), optionally with an MSH wager. Requires approval since a wager may be at stake.',
          inputSchema: {
            type: 'object',
            properties: {
              mode: { type: 'string' },
              players: SEAT_SCHEMA,
              wager: { type: 'number' },
            },
            required: ['mode', 'players'],
          },
          permissionKey: 'wordBattle.play',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.wordBattle.createGame(
              input.mode,
              input.players,
              ctx.userId,
              Number(input.wager) || 0,
            ),
          describeAction: (input) =>
            input.wager > 0
              ? `Create a Word Battle game with a ${input.wager} MSH wager`
              : 'Create a Word Battle game',
          describeResult: () => 'Word Battle game created.',
        },
        {
          name: 'submitWordleGuess',
          description: 'Submit a guess in a Wordle Duel game.',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              word: { type: 'string' },
            },
            required: ['gameId', 'word'],
          },
          permissionKey: 'wordBattle.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.wordBattle.submitWordleGuess(
              input.gameId,
              ctx.userId,
              input.word,
            ),
          describeResult: () => 'Guess submitted.',
        },
        {
          name: 'submitBoggleWord',
          description: 'Submit a found word in a Boggle game.',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              word: { type: 'string' },
            },
            required: ['gameId', 'word'],
          },
          permissionKey: 'wordBattle.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.wordBattle.submitBoggleWord(
              input.gameId,
              ctx.userId,
              input.word,
            ),
          describeResult: () => 'Word submitted.',
        },
        {
          name: 'placeScrabbleWord',
          description: 'Place a word on the board in a Scrabble game.',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              placements: {
                type: 'array',
                items: { type: 'object' },
                description: 'Tile placements, e.g. [{row, col, letter}]',
              },
            },
            required: ['gameId', 'placements'],
          },
          permissionKey: 'wordBattle.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.wordBattle.placeScrabbleWord(
              input.gameId,
              ctx.userId,
              input.placements,
            ),
          describeResult: () => 'Word placed.',
        },
        {
          name: 'passScrabble',
          description: 'Pass your turn in a Scrabble game.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'wordBattle.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.wordBattle.passScrabble(input.gameId, ctx.userId),
          describeResult: () => 'Turn passed.',
        },
        {
          name: 'exchangeScrabble',
          description: 'Exchange rack tiles for new ones in a Scrabble game.',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              rackIndices: { type: 'array', items: { type: 'number' } },
            },
            required: ['gameId', 'rackIndices'],
          },
          permissionKey: 'wordBattle.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.wordBattle.exchangeScrabble(
              input.gameId,
              ctx.userId,
              input.rackIndices,
            ),
          describeResult: () => 'Tiles exchanged.',
        },
      ]),
    );
  }
}
