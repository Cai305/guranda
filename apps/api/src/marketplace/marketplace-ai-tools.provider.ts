import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { MarketplaceService } from './marketplace.service';

@Injectable()
export class MarketplaceAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private marketplace: MarketplaceService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('marketplace', [
        {
          name: 'search',
          description:
            'Search marketplace listings (buy-now or auction), optionally filtered by category, listing type or a search term.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              listingType: {
                type: 'string',
                description: 'FIXED_PRICE or AUCTION',
              },
              search: { type: 'string' },
            },
          },
          permissionKey: 'marketplace.read',
          sensitive: false,
          defaultGranted: true,
          renderAs: 'listing-list',
          handler: (_ctx, input) => this.marketplace.browse(input || {}),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No marketplace listings found.'
              : output
                  .slice(0, 8)
                  .map(
                    (l) =>
                      `${l.id}: ${l.title} — ${l.currentBid ?? l.price} MSH${l.currentBid ? ' (current bid)' : ''} — ${l.category}`,
                  )
                  .join('\n'),
        },
        {
          name: 'myListings',
          description: "List the user's own marketplace listings.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'marketplace.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.marketplace.myListings(ctx.userId),
        },
        {
          name: 'myBids',
          description: 'List bids the user has placed on marketplace auctions.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'marketplace.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.marketplace.myBids(ctx.userId),
        },
        {
          name: 'buyNow',
          description:
            'Buy a fixed-price marketplace listing immediately. Deducts MSH from the wallet. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: { listingId: { type: 'string' } },
            required: ['listingId'],
          },
          permissionKey: 'marketplace.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.marketplace.buyNow(ctx.userId, input.listingId),
          describeAction: (input) =>
            `Buy marketplace listing ${input.listingId} now`,
          describeResult: (input) => `Bought listing ${input.listingId}.`,
        },
        {
          name: 'placeBid',
          description:
            'Place a bid on a marketplace auction listing. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              listingId: { type: 'string' },
              amount: { type: 'number' },
            },
            required: ['listingId', 'amount'],
          },
          permissionKey: 'marketplace.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.marketplace.placeBid(
              ctx.userId,
              input.listingId,
              Number(input.amount),
            ),
          describeAction: (input) =>
            `Bid ${input.amount} MSH on listing ${input.listingId}`,
          describeResult: (input) =>
            `Bid ${input.amount} MSH placed on listing ${input.listingId}.`,
        },
      ]),
    );
  }
}
