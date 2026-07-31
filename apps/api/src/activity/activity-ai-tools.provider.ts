import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { ActivityService } from './activity.service';

@Injectable()
export class ActivityAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private activity: ActivityService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('activity', [
        {
          name: 'gamesSummary',
          description:
            "Summary of the user's games played across all game modules (Chess, Ludo, Pool, Word Battle, etc.).",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'activity.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.activity.gamesSummary(ctx.userId),
        },
      ]),
    );
  }
}
