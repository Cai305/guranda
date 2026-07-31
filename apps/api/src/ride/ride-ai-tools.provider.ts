import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { RideService } from './ride.service';
import { geocodeAddress } from '../common/geocoding';

@Injectable()
export class RideAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private ride: RideService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('ride', [
        {
          name: 'request',
          description:
            'Request transport for the user. Fill both addresses from what the user told you; ask if the pickup is unclear. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              pickupAddress: {
                type: 'string',
                description: 'Where to pick the user up',
              },
              dropoffAddress: {
                type: 'string',
                description: 'Where the user is going',
              },
            },
            required: ['pickupAddress', 'dropoffAddress'],
          },
          permissionKey: 'ride.book',
          legacyAliases: ['rideBook'],
          sensitive: true,
          defaultGranted: false,
          handler: async (ctx, input) => {
            const [pickup, dropoff] = await Promise.all([
              geocodeAddress(input.pickupAddress),
              geocodeAddress(input.dropoffAddress),
            ]);
            if (!pickup)
              throw new BadRequestException(
                `Couldn't find a location matching pickup address "${input.pickupAddress}" — ask for a more specific address.`,
              );
            if (!dropoff)
              throw new BadRequestException(
                `Couldn't find a location matching dropoff address "${input.dropoffAddress}" — ask for a more specific address.`,
              );
            return this.ride.requestRide(ctx.userId, {
              pickupLat: pickup.lat,
              pickupLng: pickup.lng,
              pickupAddress: input.pickupAddress,
              dropoffLat: dropoff.lat,
              dropoffLng: dropoff.lng,
              dropoffAddress: input.dropoffAddress,
              fare: 10.0,
            });
          },
          describeAction: (input) =>
            `Request a ride from "${input.pickupAddress}" to "${input.dropoffAddress}"`,
          describeResult: (input, output) =>
            `Ride requested (id ${output.id.slice(0, 8)}). Status: ${output.status} — from "${input.pickupAddress}" to "${input.dropoffAddress}". The user can track it in the Ride module.`,
        },
        {
          name: 'status',
          description: "Check the user's currently active ride, if any.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'ride.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'ride-status',
          handler: (ctx) => this.ride.getActiveRideForRider(ctx.userId),
          describeResult: (_i, output) =>
            output
              ? `Active ride: ${output.status} — from "${output.pickupAddress}" to "${output.dropoffAddress}".`
              : 'No active ride right now.',
        },
      ]),
    );
  }
}
