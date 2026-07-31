import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { StoreService } from './store.service';

@Injectable()
export class MiniAppsAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private store: StoreService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('miniapps', [
        {
          name: 'list',
          description:
            "List every mini app and built-in module in the Store, each flagged with whether this user has it installed. Check this before saying a capability isn't available.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'apps.access',
          legacyAliases: ['appsAccess'],
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.store.getCatalogForUser(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No mini apps published yet.'
              : output
                  .map((a) => {
                    const status = a.installed ? 'installed' : 'NOT installed';
                    const detail = a.solves ? ` — solves: ${a.solves}` : '';
                    const features = a.features?.length
                      ? ` — features: ${a.features.join(', ')}`
                      : '';
                    return `${a.id} (${a.kind}, ${status}): ${a.name} — ${a.description}${detail}${features}`;
                  })
                  .join('\n'),
        },
        {
          name: 'install',
          description:
            'Install a mini app or built-in module for this user (unlocks it in their app). Always confirm with the user first in your own reply — this executes immediately once called.',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'The id from miniapps.list, e.g. "travel"',
              },
            },
            required: ['appId'],
          },
          permissionKey: 'apps.access',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.store.installApp(ctx.userId, input.appId),
          describeResult: (input) => `Installed ${input.appId}.`,
        },
        {
          name: 'uninstall',
          description: 'Remove a mini app or built-in module for this user.',
          inputSchema: {
            type: 'object',
            properties: { appId: { type: 'string' } },
            required: ['appId'],
          },
          permissionKey: 'apps.access',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.store.uninstallApp(ctx.userId, input.appId),
          describeResult: (input) => `Uninstalled ${input.appId}.`,
        },
      ]),
    );
  }
}
