import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { UsersService } from './users.service';

const STALE_LOCATION_MS = 30 * 60 * 1000; // beyond this, tell the AI to treat it as approximate, not current

@Injectable()
export class SettingsAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private users: UsersService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('settings', [
        {
          name: 'getProfile',
          description:
            "Read the user's own profile (display name, bio, reputation, stats).",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'profile.read',
          legacyAliases: ['profileRead'],
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.users.getProfile(ctx.userId),
        },
        {
          name: 'updateProfile',
          description:
            "Update the user's own profile (display name, bio, status message, avatar). Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              displayName: { type: 'string' },
              bio: { type: 'string' },
              statusMessage: { type: 'string' },
              avatarUrl: { type: 'string' },
            },
          },
          permissionKey: 'profile.edit',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.users.updateProfile(ctx.userId, input),
          describeAction: (input) =>
            `Update profile: ${Object.keys(input).join(', ')}`,
          describeResult: () => 'Profile updated.',
        },
      ]),
    );

    this.registry.registerMany(
      defineTools('contacts', [
        {
          name: 'search',
          description:
            'Search for other users by username, display name, or phone number.',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
          },
          permissionKey: 'contacts.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.users.searchUsers(input.query, ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No matching users found.'
              : output
                  .slice(0, 10)
                  .map((u: any) => `@${u.username}`)
                  .join(', '),
        },
      ]),
    );

    this.registry.registerMany(
      defineTools('location', [
        {
          name: 'current',
          description:
            "Get the user's current GPS location (latitude/longitude), reported live by their phone. Use this any time knowing where they are would help — nearby recommendations, weather, travel/ride planning, local time zone, etc. — without asking them to type their address.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'location.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.users.getLocation(ctx.userId),
          describeResult: (
            _i,
            output: {
              lat: number;
              lng: number;
              label?: string | null;
              updatedAt: string | Date;
            } | null,
          ) => {
            if (!output)
              return "No location on file yet — the app hasn't shared a GPS fix for this user.";
            const ageMs = Date.now() - new Date(output.updatedAt).getTime();
            const staleNote =
              ageMs > STALE_LOCATION_MS
                ? ` (last updated ${Math.round(ageMs / 60000)} min ago — may be stale)`
                : ' (live)';
            const place = output.label ? `${output.label} — ` : '';
            return `${place}lat ${output.lat}, lng ${output.lng}${staleNote}`;
          },
        },
      ]),
    );
  }
}
