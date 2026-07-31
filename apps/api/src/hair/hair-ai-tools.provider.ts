import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { HairService } from './hair.service';

@Injectable()
export class HairAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private hair: HairService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('hair', [
        {
          name: 'search',
          description:
            'Search hairdressers/beauty professionals, optionally near a location and/or matching a search term.',
          inputSchema: {
            type: 'object',
            properties: {
              lat: { type: 'number', description: "User's latitude, if known" },
              lng: {
                type: 'number',
                description: "User's longitude, if known",
              },
              radiusKm: {
                type: 'number',
                description: 'Search radius in km, defaults to 20',
              },
              query: { type: 'string' },
            },
          },
          permissionKey: 'hair.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.hair.searchHairdressers(
              input?.lat,
              input?.lng,
              input?.radiusKm ?? 20,
              input?.query,
            ),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No hairdressers found.'
              : output
                  .slice(0, 8)
                  .map(
                    (d: any) => `${d.id}: ${d.businessName} — ${d.displayName}`,
                  )
                  .join('\n'),
        },
        {
          name: 'bookAppointment',
          description: 'Book a hairdresser appointment. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              hairdresserId: { type: 'string' },
              serviceId: { type: 'string' },
              appointmentAt: { type: 'string', description: 'ISO datetime' },
            },
            required: ['hairdresserId', 'serviceId', 'appointmentAt'],
          },
          permissionKey: 'hair.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.hair.createBooking(ctx.userId, {
              ...input,
              purchasedItemsIds: [],
            }),
          describeAction: (input) =>
            `Book a hairdresser appointment at ${input.appointmentAt}`,
          describeResult: () => 'Appointment booked.',
        },
      ]),
    );
  }
}
