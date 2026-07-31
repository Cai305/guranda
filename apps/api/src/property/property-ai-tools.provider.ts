import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { PropertyService } from './property.service';

@Injectable()
export class PropertyAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private property: PropertyService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('property', [
        {
          name: 'browse',
          description: 'Browse property listings for sale or rent.',
          inputSchema: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                description: 'e.g. residential, commercial',
              },
              listingType: { type: 'string', description: 'e.g. rent, sale' },
            },
          },
          permissionKey: 'property.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'property-list',
          handler: (_ctx, input) => this.property.browse(input),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No properties found.'
              : output
                  .slice(0, 8)
                  .map(
                    (p) =>
                      `${p.id}: ${p.title} — ${p.price} MSH${p.listingType === 'RENT' ? '/month' : ''} — ${p.address}`,
                  )
                  .join('\n'),
        },
        {
          name: 'myRentals',
          description:
            "List the properties the user currently rents (their tenancies), including rent status and any open issues — the right answer for 'what's my rent situation?'",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'property.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.property.myRentals(ctx.userId),
        },
      ]),
    );
  }
}
