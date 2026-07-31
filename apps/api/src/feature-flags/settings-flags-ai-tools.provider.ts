import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class SettingsFlagsAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private featureFlags: FeatureFlagsService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('settings', [
        {
          name: 'getFeatureFlags',
          description:
            'Read which modules are currently enabled, verified-only, or off for the platform.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'settings.read',
          sensitive: false,
          defaultGranted: true,
          handler: () => this.featureFlags.getAll(),
        },
      ]),
    );
  }
}
