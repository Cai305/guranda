import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';

// Every tool here reads data that lives ONLY on the user's phone — contacts,
// the device's native calendar, the photo library — none of which exists in
// Guranda's own database. The execution model everywhere else in this
// registry is "handler runs server-side against Prisma"; that doesn't work
// here, so these tools instead lean on the *existing* sensitive/approval
// round-trip (ActionExecutorService: sensitive tool → 'pending' → mobile
// shows an approval card → POST /ai/resolve re-runs with approved:true).
//
// The mobile client (AiConversationContext) recognizes the `device.*`
// namespace and, right before calling /ai/resolve, performs the actual
// native fetch/write itself (expo-contacts / expo-calendar) and merges the
// result into `pendingAction.input.deviceData` — nothing server-side
// changed to allow this, `action.input` was always client-controlled at
// resolve time (see agent-runtime.service.ts resumeAfterAction). By the time
// a handler below actually runs, `input.deviceData` is already populated;
// sensitive tools never invoke their handler on the first (pre-approval)
// pass at all, so there's no "empty deviceData" case to guard against.
@Injectable()
export class DeviceAiToolsProvider implements OnModuleInit {
  constructor(private registry: ToolRegistryService) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('device', [
        {
          name: 'contactsSearch',
          description:
            "Search the user's phone contacts by name. Returns matching contacts (name + phone numbers) read live from the device — requires the user to grant Contacts access. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Name (or part of a name) to search for',
              },
            },
            required: ['query'],
          },
          permissionKey: 'device.contactsSearch',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) =>
            `Search your phone contacts for "${input.query}"`,
          handler: async (_ctx, input) => input.deviceData ?? { contacts: [] },
          describeResult: (_input, output) => {
            if (output?.permissionDenied) return 'Contacts access was not granted on this device.';
            const contacts = output?.contacts ?? [];
            if (contacts.length === 0) return 'No matching contacts found.';
            return contacts
              .map(
                (c: any) =>
                  `${c.name}${c.phoneNumbers?.length ? ` (${c.phoneNumbers.join(', ')})` : ''}`,
              )
              .join('; ');
          },
        },
        {
          name: 'calendarRead',
          description:
            "Read upcoming events from the user's phone's native calendar app (not Guranda's own in-app reminders — see the 'calendar' module for those). Requires the user to grant Calendar access. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              days: {
                type: 'number',
                description: 'How many days ahead to look (default 7)',
              },
            },
          },
          permissionKey: 'device.calendarRead',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) =>
            `Read your phone's calendar for the next ${input.days || 7} day${(input.days || 7) === 1 ? '' : 's'}`,
          handler: async (_ctx, input) => input.deviceData ?? { events: [] },
          describeResult: (_input, output) => {
            if (output?.permissionDenied) return 'Calendar access was not granted on this device.';
            const events = output?.events ?? [];
            if (events.length === 0) return 'No upcoming events found.';
            return events
              .map((e: any) => `${e.title} — ${e.startDate}${e.location ? ` @ ${e.location}` : ''}`)
              .join('; ');
          },
        },
        {
          name: 'calendarCreate',
          description:
            "Create an event directly in the user's phone's native calendar app (not a Guranda in-app reminder). Requires the user to grant Calendar access. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Event title' },
              startTime: { type: 'string', description: 'ISO 8601 start time' },
              endTime: { type: 'string', description: 'ISO 8601 end time' },
              location: { type: 'string', description: 'Optional location' },
              notes: { type: 'string', description: 'Optional notes' },
            },
            required: ['title', 'startTime', 'endTime'],
          },
          permissionKey: 'device.calendarCreate',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) =>
            `Add "${input.title}" to your phone's calendar (${new Date(input.startTime).toLocaleString()})`,
          // The actual Calendar.createEventAsync() call happens on-device,
          // client-side, at approval time — there is nothing for Guranda's
          // own database to persist, so this handler is just confirming
          // that already happened.
          handler: async (_ctx, input) => ({
            created: !!input.deviceData?.created,
            permissionDenied: !!input.deviceData?.permissionDenied,
          }),
          describeResult: (input, output) => {
            if (output?.created) return `Added "${input.title}" to your calendar.`;
            if (output?.permissionDenied) return 'Calendar access was not granted on this device.';
            return `Could not add "${input.title}" to your calendar.`;
          },
        },
        {
          name: 'photosRecent',
          description:
            "List the user's most recent camera roll photos (filenames and dates only — not the image content itself). Requires the user to grant Photos access. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              count: {
                type: 'number',
                description: 'How many recent photos to list (default 10)',
              },
            },
          },
          permissionKey: 'device.photosRecent',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) =>
            `Look at your ${input.count || 10} most recent photos (just filenames and dates, not the images)`,
          handler: async (_ctx, input) => input.deviceData ?? { photos: [] },
          describeResult: (_input, output) => {
            if (output?.permissionDenied) return 'Photos access was not granted on this device.';
            const photos = output?.photos ?? [];
            if (photos.length === 0) return 'No photos found.';
            return `${photos.length} recent photo${photos.length === 1 ? '' : 's'}: ${photos
              .map((p: any) => new Date(p.creationTime).toLocaleDateString())
              .join(', ')}`;
          },
        },
        {
          name: 'clipboardRead',
          description:
            "Read the text currently on the user's phone clipboard. Requires approval since the clipboard can contain passwords, OTP codes, or other sensitive text the user copied.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'device.clipboardRead',
          sensitive: true,
          defaultGranted: false,
          describeAction: () => 'Read what\'s on your clipboard',
          handler: async (_ctx, input) => input.deviceData ?? { text: null },
          describeResult: (_input, output) => {
            if (output?.permissionDenied) return 'Clipboard access was not granted on this device.';
            const text = output?.text;
            if (!text) return 'Clipboard is empty.';
            return text.length > 100 ? `${text.slice(0, 100)}...` : text;
          },
        },
        {
          name: 'clipboardWrite',
          description:
            "Copy text to the user's phone clipboard, overwriting whatever was there before. Requires approval since it mutates device state.",
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Text to copy to the clipboard' },
            },
            required: ['text'],
          },
          permissionKey: 'device.clipboardWrite',
          sensitive: true,
          defaultGranted: false,
          describeAction: (input) => {
            const text: string = input.text ?? '';
            const preview = text.length > 100 ? `${text.slice(0, 100)}...` : text;
            return `Copy "${preview}" to your clipboard`;
          },
          // Same pattern as calendarCreate: the client already performed the
          // native clipboard write at approval time, so this handler just
          // confirms it happened. Clipboard writes don't need OS permission,
          // so there's no permissionDenied field here.
          handler: async (_ctx, input) => ({ written: !!input.deviceData?.written }),
          describeResult: (_input, output) =>
            output?.written ? 'Copied to your clipboard.' : 'Could not copy to your clipboard.',
        },
        {
          name: 'batteryStatus',
          description:
            "Read the phone's current battery level and charging state. Benign read-only device telemetry — not sensitive, auto-granted.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'device.batteryStatus',
          sensitive: false,
          defaultGranted: true,
          describeAction: () => 'Check your battery level',
          handler: async (_ctx, input) => input.deviceData ?? { level: null, state: null },
          describeResult: (_input, output) => {
            const level = output?.level;
            if (level === null || level === undefined) return 'Battery info unavailable.';
            // level arrives already as a 0-100 integer (converted client-side
            // in deviceToolFulfillment.ts's batteryStatus()), not a 0-1 fraction.
            const charging = output?.state === 'charging';
            return `${level}% battery, ${charging ? 'charging' : 'not charging'}`;
          },
        },
        {
          name: 'info',
          description:
            "Read basic phone info: device model name, OS name and version. Benign read-only device telemetry — not sensitive, auto-granted.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'device.info',
          sensitive: false,
          defaultGranted: true,
          describeAction: () => 'Check your phone info',
          handler: async (_ctx, input) => input.deviceData ?? {},
          describeResult: (_input, output) => {
            const model = output?.modelName;
            const osLabel = [output?.osName, output?.osVersion].filter(Boolean).join(' ');
            const summary = [model, osLabel].filter(Boolean).join(', ');
            return summary || 'Phone info unavailable.';
          },
        },
      ]),
    );
  }
}
