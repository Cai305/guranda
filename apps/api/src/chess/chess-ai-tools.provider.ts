import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { ChessService } from './chess.service';

@Injectable()
export class ChessAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private chess: ChessService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('chess', [
        {
          name: 'myGame',
          description: 'Get the current state of a chess game by id.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'chess.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.chess.getGame(input.gameId),
        },
        {
          name: 'create',
          description: 'Create a new chess game against another user.',
          inputSchema: {
            type: 'object',
            properties: {
              opponentId: { type: 'string' },
              timeControl: { type: 'number', description: 'Seconds per side' },
            },
            required: ['opponentId', 'timeControl'],
          },
          permissionKey: 'chess.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.chess.createGame(
              ctx.userId,
              input.opponentId,
              Number(input.timeControl),
            ),
          describeResult: () => 'Chess game created.',
        },
        {
          name: 'move',
          description:
            'Make a move in an ongoing chess game (algebraic square coordinates, e.g. e2 to e4).',
          inputSchema: {
            type: 'object',
            properties: {
              gameId: { type: 'string' },
              from: { type: 'string' },
              to: { type: 'string' },
              promotion: {
                type: 'string',
                description: "Promotion piece if applicable, e.g. 'q'",
              },
            },
            required: ['gameId', 'from', 'to'],
          },
          permissionKey: 'chess.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.chess.makeMove(
              input.gameId,
              ctx.userId,
              input.from,
              input.to,
              input.promotion,
            ),
          describeResult: () => 'Move played.',
        },
        {
          name: 'resign',
          description: 'Resign from an ongoing chess game.',
          inputSchema: {
            type: 'object',
            properties: { gameId: { type: 'string' } },
            required: ['gameId'],
          },
          permissionKey: 'chess.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) => this.chess.resign(input.gameId, ctx.userId),
          describeResult: () => 'Resigned.',
        },
        {
          name: 'rematch',
          description: 'Start a rematch of a finished chess game.',
          inputSchema: {
            type: 'object',
            properties: { originalGameId: { type: 'string' } },
            required: ['originalGameId'],
          },
          permissionKey: 'chess.play',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.chess.createRematch(input.originalGameId),
          describeResult: () => 'Rematch created.',
        },
      ]),
    );
  }
}
