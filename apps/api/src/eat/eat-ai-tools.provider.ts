import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { EatService } from './eat.service';

@Injectable()
export class EatAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private eat: EatService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('eat', [
        {
          name: 'searchStores',
          description:
            'List food stores/restaurants, optionally filtered by category.',
          inputSchema: {
            type: 'object',
            properties: { category: { type: 'string' } },
          },
          permissionKey: 'eat.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'store-list',
          handler: (_ctx, input) => this.eat.listStores(input?.category),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No food stores found.'
              : output
                  .slice(0, 8)
                  .map((s) => `${s.id}: ${s.name} — ${s.category}`)
                  .join('\n'),
        },
        {
          name: 'myOrders',
          description: "List the user's own food orders.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'eat.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.eat.getMyOrders(ctx.userId),
        },
        {
          name: 'placeOrder',
          description:
            'Place a food order for delivery from one store. Deducts MSH from the wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              storeId: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    quantity: { type: 'number' },
                  },
                  required: ['productId', 'quantity'],
                },
              },
              deliveryAddress: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['storeId', 'items', 'deliveryAddress'],
          },
          permissionKey: 'eat.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.eat.placeOrder(ctx.userId, input),
          describeAction: (input) =>
            `Order food (${input.items?.length ?? 0} item(s)) delivered to ${input.deliveryAddress}`,
          describeResult: () => 'Food order placed.',
        },
      ]),
    );
  }
}
