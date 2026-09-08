import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { AiService } from './ai.service';

@Injectable()
export class MemoryAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private ai: AiService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('memory', [
        {
          name: 'remember',
          description:
            "Save a short, durable fact about the user for future conversations — a preference, a recurring detail, something they told you that's worth keeping past this session. Don't use this for one-off task details or anything a tool's own data already covers (wallet balance, bookings, etc.) — only for things you'd otherwise forget between sessions.",
          inputSchema: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Short title, e.g. "Prefers window seats"' },
              detail: { type: 'string', description: 'The fact itself, one or two sentences' },
            },
            required: ['label', 'detail'],
          },
          permissionKey: 'memory.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) => this.ai.createMemory(ctx.userId, input.label, input.detail, 'ai'),
          describeResult: (input) => `Remembered: "${input.label}".`,
        },
        {
          name: 'forget',
          description: 'Delete a memory (yours or the user\'s) by id — use when the user says something is no longer true or asks you to forget it. Call memory.list first if you need the id.',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'The memory id, from memory.list' } },
            required: ['id'],
          },
          permissionKey: 'memory.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) => this.ai.deleteMemory(ctx.userId, input.id),
          describeResult: () => 'Memory forgotten.',
        },
        {
          name: 'list',
          description:
            "List everything currently remembered about the user, with ids. Your saved memories are already included in your system context every turn — only call this if you specifically need an id to forget one.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'memory.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.ai.listMemories(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No memories saved.'
              : output.map((m) => `${m.id}: ${m.label} — ${m.detail}`).join('\n'),
        },
      ]),
    );
  }
}
