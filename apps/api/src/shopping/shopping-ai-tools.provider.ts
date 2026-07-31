import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { ShoppingService } from './shopping.service';

@Injectable()
export class ShoppingAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private shopping: ShoppingService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('shopping', [
        {
          name: 'searchProducts',
          description:
            'Search retail products, optionally filtered by category or a search term.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              search: { type: 'string' },
            },
          },
          permissionKey: 'shopping.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'product-list',
          handler: (_ctx, input) => this.shopping.listProducts(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No products found.'
              : output
                  .slice(0, 8)
                  .map((p) => `${p.id}: ${p.name} — ${p.price} MSH`)
                  .join('\n'),
        },
        {
          name: 'myOrders',
          description: "List the user's own shopping orders.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'shopping.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.shopping.getMyOrders(ctx.userId),
        },
        {
          name: 'placeOrder',
          description:
            'Place a shopping order for products from one store. Deducts MSH from the wallet. Requires approval.',
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
              shippingAddress: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['storeId', 'items', 'shippingAddress'],
          },
          permissionKey: 'shopping.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) => this.shopping.placeOrder(ctx.userId, input),
          describeAction: (input) =>
            `Place a shopping order (${input.items?.length ?? 0} item(s)) to be shipped to ${input.shippingAddress}`,
          describeResult: () => 'Order placed.',
        },
      ]),
    );
  }
}
