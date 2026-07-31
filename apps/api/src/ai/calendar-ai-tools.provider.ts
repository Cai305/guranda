import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { AiReminderService } from './ai-reminder.service';

@Injectable()
export class CalendarAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private reminders: AiReminderService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('calendar', [
        {
          name: 'list',
          description:
            "List the user's upcoming reminders and wake-ups. Call this before proposing a new wake-up.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'calendar.read',
          legacyAliases: ['calendarRead'],
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.reminders.list(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No upcoming reminders.'
              : output
                  .map(
                    (r) =>
                      `"${r.title}" at ${r.fireAt.toISOString()}${r.prepNote ? ` (${r.prepNote})` : ''}`,
                  )
                  .join('\n'),
        },
        {
          name: 'create',
          description:
            'Create a reminder or wake-up alarm for the user. For appointment wake-ups, compute the wake time yourself including preparation and travel time, and explain the reasoning in prepNote. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'e.g. "Wake up — doctor appointment"',
              },
              fireAtIso: {
                type: 'string',
                description: 'When to fire, ISO 8601 local time',
              },
              prepNote: {
                type: 'string',
                description:
                  'Why this time, e.g. "90 min to get ready + 30 min travel"',
              },
            },
            required: ['title', 'fireAtIso'],
          },
          permissionKey: 'calendar.edit',
          legacyAliases: ['calendarEdit'],
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.reminders.create(ctx.userId, input),
          describeAction: (input) =>
            `Set "${input.title}" for ${new Date(input.fireAtIso).toLocaleString()}${input.prepNote ? ` (${input.prepNote})` : ''}`,
          describeResult: (input) =>
            `Reminder "${input.title}" set for ${new Date(input.fireAtIso).toISOString()}.`,
        },
      ]),
    );
  }
}
