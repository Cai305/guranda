import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { IntegrationsService } from './integrations.service';

const NOT_CONNECTED =
  "The user hasn't connected their Google Calendar yet — suggest they connect it under Profile > External Apps.";

// The user's REAL Google Calendar via OAuth — distinct from both Guranda's
// own in-app reminders ('calendar' module, apps/api/src/ai/calendar-ai-
// tools.provider.ts) and the phone's native calendar app ('device' module,
// device.calendarRead/Create — no Google account involved there at all).
@Injectable()
export class GoogleCalendarAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private integrations: IntegrationsService,
  ) {}

  private async accessToken(userId: string): Promise<string> {
    const token = await this.integrations.getValidAccessToken(userId, 'google_calendar');
    if (!token) throw new BadRequestException(NOT_CONNECTED);
    return token;
  }

  onModuleInit() {
    this.registry.registerMany(
      defineTools('googleCalendar', [
        {
          name: 'listEvents',
          description:
            "List upcoming events on the user's real Google Calendar (requires the user to have connected their Google account in Guranda settings).",
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'number', description: 'How many days ahead to look (default 7)' },
            },
          },
          permissionKey: 'googleCalendar.listEvents',
          sensitive: false,
          defaultGranted: false,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const timeMin = new Date().toISOString();
            const timeMax = new Date(Date.now() + (input.days || 7) * 24 * 60 * 60 * 1000).toISOString();
            const params = new URLSearchParams({
              timeMin,
              timeMax,
              singleEvents: 'true',
              orderBy: 'startTime',
              maxResults: '25',
            });
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const data: any = await res.json();
            if (!res.ok) throw new BadRequestException(data.error?.message || 'Failed to read Google Calendar.');
            return {
              events: (data.items || []).map((e: any) => ({
                title: e.summary || '(untitled)',
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                location: e.location || null,
              })),
            };
          },
          describeResult: (_i, output: any) => {
            const events = output?.events ?? [];
            if (events.length === 0) return 'No upcoming events found.';
            return events.map((e: any) => `${e.title} — ${e.start}`).join('; ');
          },
        },
        {
          name: 'createEvent',
          description:
            "Create an event on the user's real Google Calendar. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              startTime: { type: 'string', description: 'ISO 8601 start time' },
              endTime: { type: 'string', description: 'ISO 8601 end time' },
              location: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['title', 'startTime', 'endTime'],
          },
          permissionKey: 'googleCalendar.createEvent',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => `Add "${input.title}" to your Google Calendar`,
          handler: async (ctx, input) => {
            const token = await this.accessToken(ctx.userId);
            const res = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  summary: input.title,
                  location: input.location,
                  description: input.notes,
                  start: { dateTime: input.startTime },
                  end: { dateTime: input.endTime },
                }),
              },
            );
            const data: any = await res.json();
            if (!res.ok) throw new BadRequestException(data.error?.message || 'Failed to create the event.');
            return { created: true, eventLink: data.htmlLink };
          },
          describeResult: (input) =>
            `Added "${input.title}" to your Google Calendar.`,
        },
      ]),
    );
  }
}
