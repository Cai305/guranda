import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { CarwashService } from './carwash.service';

@Injectable()
export class CarwashAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private carwash: CarwashService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('carwash', [
        {
          name: 'searchCarWashes',
          description: 'List available car washes and their services.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'carwash.read',
          sensitive: false,
          defaultGranted: true,
          handler: () => this.carwash.listCarWashes(),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No car washes found.'
              : output
                  .map((cw) => `${cw.id}: ${cw.name} - ${cw.address} (Services: ${cw.services?.length || 0})`)
                  .join('\n'),
        },
        {
          name: 'bookCarWash',
          description: 'Book a car wash service.',
          inputSchema: {
            type: 'object',
            properties: {
              carWashId: { type: 'string' },
              serviceId: { type: 'string' },
              scheduledFor: { type: 'string', description: 'ISO date string (optional)' },
            },
            required: ['carWashId', 'serviceId'],
          },
          permissionKey: 'carwash.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.carwash.bookCarWash(ctx.userId, input),
          describeAction: (input) => `Book car wash service ${input.serviceId} at car wash ${input.carWashId}`,
          describeResult: () => 'Car wash booked successfully.',
        },
      ]),
    );
  }
}
