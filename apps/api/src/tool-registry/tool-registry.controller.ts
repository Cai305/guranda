import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ToolRegistryService } from './tool-registry.service';

// Flat introspection surface over the full Action Registry — "what actions
// exist", unfiltered by any one user's granted permissions (unlike
// AgentRuntimeService / McpController, which both filter listTools() by
// the caller's AiAgent.permissions since they decide what the AI/an
// external MCP client may actually invoke right now). This endpoint is for
// tooling that needs to see every registered action to build something
// against it — e.g. FeaturesService validates FeatureVersion.actionNames
// against ToolRegistryService.hasTool() directly, and a future Feature
// Builder UI would list all actions here to let an author pick from them.
// Serializes to a JSON-safe shape: `handler`/`describeAction`/
// `describeResult` (functions) are dropped, everything else is passed
// through as-is. Authenticated for the same reason CapabilitiesController
// is — raw inputSchema is exposed, no reason to hand that to an
// unauthenticated caller.
@Controller('tools')
@UseGuards(JwtAuthGuard)
export class ToolRegistryController {
  constructor(private registry: ToolRegistryService) {}

  @Get()
  list() {
    return this.registry.listTools().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      permissionKey: t.permissionKey,
      legacyAliases: t.legacyAliases,
      sensitive: t.sensitive,
      module: t.module,
      defaultGranted: t.defaultGranted,
      renderAs: t.renderAs,
      backgroundCapable: t.backgroundCapable,
      requiresCapabilityGrant: t.requiresCapabilityGrant,
    }));
  }
}
