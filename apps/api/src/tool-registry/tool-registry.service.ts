import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ToolDefinition, ToolListFilter } from './tool-registry.types';

@Injectable()
export class ToolRegistryService {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new ConflictException(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  registerMany(tools: ToolDefinition[]): void {
    tools.forEach((t) => this.register(t));
  }

  getTool(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) throw new NotFoundException(`Tool "${name}" not found`);
    return tool;
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  listTools(filter?: ToolListFilter): ToolDefinition[] {
    let all = Array.from(this.tools.values());
    if (filter?.module) all = all.filter((t) => t.module === filter.module);
    if (filter?.permissionKeys) {
      const keys = new Set(filter.permissionKeys);
      all = all.filter(
        (t) =>
          keys.has(t.permissionKey) ||
          t.legacyAliases?.some((a) => keys.has(a)),
      );
    }
    return all;
  }

  /** Used by tests/dev tooling to reset between runs — never called from production request paths. */
  clear(): void {
    this.tools.clear();
  }
}
