import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { UsernameService } from './username.service';

@Injectable()
export class UsernameAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private usernames: UsernameService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('usernames', [
        {
          name: 'checkAvailability',
          description:
            'Check whether a username label is available to claim (not reserved, not too short, not already taken).',
          inputSchema: {
            type: 'object',
            properties: { label: { type: 'string' } },
            required: ['label'],
          },
          permissionKey: 'usernames.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.usernames.checkAvailability(input.label),
          describeResult: (
            _i,
            output: { available: boolean; reason?: string },
          ) =>
            output.available
              ? 'Available.'
              : `Not available — ${output.reason}.`,
        },
        {
          name: 'mine',
          description:
            "List the user's owned usernames, including which one is active and any current listing/auction status.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'usernames.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.usernames.mine(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No usernames owned.'
              : output
                  .map(
                    (u) =>
                      `@${u.label}${u.isActive ? ' (active)' : ''} — ${u.level}, saleStatus ${u.saleStatus}`,
                  )
                  .join('\n'),
        },
        {
          name: 'browse',
          description:
            'Browse usernames currently for sale (fixed price or auction) on the Username Marketplace.',
          inputSchema: {
            type: 'object',
            properties: { search: { type: 'string' } },
          },
          permissionKey: 'usernames.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) =>
            this.usernames.browse({ search: input.search }),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No usernames currently for sale.'
              : output
                  .map(
                    (u) =>
                      `@${u.label} — ${u.saleStatus === 'AUCTION' ? `bid ${u.currentBid ?? u.price}` : `${u.price} MSH`}`,
                  )
                  .join('\n'),
        },
        {
          name: 'mint',
          description:
            'Mint (claim) a brand-new, never-before-claimed username for a flat MSH fee, beyond the free one from registration. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: { label: { type: 'string' } },
            required: ['label'],
          },
          permissionKey: 'usernames.trade',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.usernames.claimAdditional(ctx.userId, input.label),
          describeAction: (input) =>
            `Mint the username @${input.label} for 50 MSH`,
          describeResult: (input) => `Minted @${input.label}.`,
        },
        {
          name: 'activate',
          description:
            "Make one of the user's owned usernames the active one — this changes their public handle and displayed reputation (a purchased/established handle's reputation transfers with it). Requires approval.",
          inputSchema: {
            type: 'object',
            properties: { usernameId: { type: 'string' } },
            required: ['usernameId'],
          },
          permissionKey: 'usernames.trade',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.usernames.activate(ctx.userId, input.usernameId),
          describeAction: () =>
            'Switch active username (changes public handle and displayed reputation)',
          describeResult: (_i, output: any) =>
            `@${output.label} is now the active username.`,
        },
        {
          name: 'listForSale',
          description:
            "List one of the user's owned usernames for sale — fixed price or auction. Requires approval.",
          inputSchema: {
            type: 'object',
            properties: {
              usernameId: { type: 'string' },
              listingType: { type: 'string', enum: ['FIXED', 'AUCTION'] },
              price: { type: 'number' },
              durationHours: {
                type: 'number',
                description:
                  'Auction duration in hours (1-168), ignored for FIXED',
              },
            },
            required: ['usernameId', 'listingType', 'price'],
          },
          permissionKey: 'usernames.trade',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.usernames.createListing(ctx.userId, input.usernameId, input),
          describeAction: (input) =>
            `List username for ${input.listingType === 'AUCTION' ? 'auction' : 'sale'} at ${input.price} MSH`,
          describeResult: (_i, output: any) =>
            `@${output.label} is now listed (${output.saleStatus}).`,
        },
        {
          name: 'cancelListing',
          description:
            "Cancel an active sale/auction listing on one of the user's own usernames (only possible before any bids exist).",
          inputSchema: {
            type: 'object',
            properties: { usernameId: { type: 'string' } },
            required: ['usernameId'],
          },
          permissionKey: 'usernames.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.usernames.cancelListing(ctx.userId, input.usernameId),
          describeResult: (_i, output: any) =>
            `@${output.label}'s listing was cancelled.`,
        },
        {
          name: 'buyNow',
          description:
            'Buy a fixed-price username currently listed for sale. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: { usernameId: { type: 'string' } },
            required: ['usernameId'],
          },
          permissionKey: 'usernames.trade',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.usernames.buyNow(ctx.userId, input.usernameId),
          describeAction: () => 'Buy this username at its listed price',
          describeResult: (_i, output: any) =>
            `Bought @${output.label}. Call usernames.activate to start using it.`,
        },
        {
          name: 'placeBid',
          description:
            'Place a bid on a username currently up for auction. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              usernameId: { type: 'string' },
              amount: { type: 'number' },
            },
            required: ['usernameId', 'amount'],
          },
          permissionKey: 'usernames.trade',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.usernames.placeBid(
              ctx.userId,
              input.usernameId,
              Number(input.amount),
            ),
          describeAction: (input) =>
            `Bid ${input.amount} MSH on this username auction`,
          describeResult: (_i, output: any) =>
            `Bid placed — current bid is now ${output.currentBid} MSH.`,
        },
      ]),
    );
  }
}
