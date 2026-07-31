import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { TurboRacingService } from './turbo-racing.service';

// reportProgress (the client's real-time physics-simulation feedback tick)
// is intentionally excluded — not an agent-initiated action.
@Injectable()
export class TurboRacingAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private turboRacing: TurboRacingService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('turboRacing', [
        {
          name: 'myRace',
          description: 'Get the current state of a Turbo Racing race by id.',
          inputSchema: {
            type: 'object',
            properties: { raceId: { type: 'string' } },
            required: ['raceId'],
          },
          permissionKey: 'turboRacing.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.turboRacing.getRace(input.raceId),
        },
        {
          name: 'myUpgrades',
          description: "List the user's owned Turbo Racing car upgrades.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'turboRacing.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.turboRacing.getUpgrades(ctx.userId),
        },
        {
          name: 'create',
          description: 'Create a new Turbo Racing race with the given players.',
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
            },
            required: ['players'],
          },
          permissionKey: 'turboRacing.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.turboRacing.createRace(input.players, ctx.userId),
          describeResult: () => 'Race created.',
        },
        {
          name: 'setColor',
          description: "Set the user's Turbo Racing car color.",
          inputSchema: {
            type: 'object',
            properties: { color: { type: 'string' } },
            required: ['color'],
          },
          permissionKey: 'turboRacing.play',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.turboRacing.setColor(ctx.userId, input.color),
          describeResult: () => 'Car color updated.',
        },
        {
          name: 'buyUpgrade',
          description:
            'Buy a Turbo Racing car upgrade (spends MSH). Requires approval.',
          inputSchema: {
            type: 'object',
            properties: { stat: { type: 'string' } },
            required: ['stat'],
          },
          permissionKey: 'turboRacing.buy',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.turboRacing.buyUpgrade(ctx.userId, input.stat),
          describeAction: (input) => `Buy a ${input.stat} upgrade`,
          describeResult: () => 'Upgrade purchased.',
        },
      ]),
    );
  }
}
