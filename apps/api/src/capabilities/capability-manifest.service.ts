import { Injectable } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { CapabilityManifest, WIDGET_ACTION_CATALOG } from '@mxit2/types';

function titleCase(moduleName: string): string {
  return moduleName
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Phase 3 (Capability Engine) per docs/19 §8: "connect these three, not add
 * a fourth" — ToolRegistryService (150 registered tools, runtime-enforced)
 * is the single source of truth; this service is purely a read-model that
 * groups its tools by module into the CapabilityManifest shape that's
 * existed in packages/types since Phase 1 but never had a producer. No new
 * storage, no duplicated tool data — regenerated on every call from
 * whatever's currently registered, so it can never drift from what the AI
 * can actually call.
 */
@Injectable()
export class CapabilityManifestService {
  constructor(private registry: ToolRegistryService) {}

  generate(): CapabilityManifest[] {
    const byModule = new Map<string, ReturnType<ToolRegistryService['listTools']>>();
    for (const tool of this.registry.listTools()) {
      const list = byModule.get(tool.module) ?? [];
      list.push(tool);
      byModule.set(tool.module, list);
    }

    return Array.from(byModule.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduleName, tools]) => {
        const requiresGrant = tools.some((t) => t.requiresCapabilityGrant);
        return {
          key: moduleName,
          name: titleCase(moduleName),
          version: '1.0.0',
          description: `Built-in ${titleCase(moduleName)} capabilities.`,
          requiredScopes: requiresGrant ? [moduleName] : [],
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            sensitive: t.sensitive,
          })),
          widgets: Array.from(
            new Set(tools.map((t) => t.renderAs).filter((r): r is string => !!r)),
          ),
          voiceInteractions: Array.from(
            new Set(
              tools
                .map((t) => t.renderAs)
                .filter((r): r is string => !!r)
                .flatMap((renderAs) => Object.keys(WIDGET_ACTION_CATALOG[renderAs]?.voicePhrases ?? {})),
            ),
          ),
        };
      });
  }
}
