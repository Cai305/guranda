import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { FinanceService } from './finance.service';

@Injectable()
export class FinanceAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private finance: FinanceService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('finance', [
        {
          name: 'myStokvels',
          description:
            'List stokvels (group savings pots) the user is a member of.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'finance.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.finance.myStokvels(ctx.userId),
        },
        {
          name: 'searchStokvels',
          description:
            'Search publicly discoverable stokvels, optionally filtered by category.',
          inputSchema: {
            type: 'object',
            properties: { category: { type: 'string' } },
          },
          permissionKey: 'finance.read',
          sensitive: false,
          defaultGranted: true,
          handler: (_ctx, input) => this.finance.listStokvels(input?.category),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No public stokvels found.'
              : output
                  .slice(0, 8)
                  .map((s) => `${s.id}: ${s.name}`)
                  .join('\n'),
        },
        {
          name: 'stokvelRequests',
          description:
            'List funding requests for a stokvel the user belongs to.',
          inputSchema: {
            type: 'object',
            properties: { stokvelId: { type: 'string' } },
            required: ['stokvelId'],
          },
          permissionKey: 'finance.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.finance.listRequests(input.stokvelId, ctx.userId),
        },
        {
          name: 'contribute',
          description:
            'Contribute funds (XRP) to a stokvel the user belongs to. Real money movement — requires approval. This settles on the real XRPL testnet, which can take a few seconds; runs in the background, poll GET /ai/executions/:id with the returned executionId if you need to confirm it landed.',
          inputSchema: {
            type: 'object',
            properties: {
              stokvelId: { type: 'string' },
              amountXrp: {
                type: 'number',
                description:
                  'Defaults to the stokvel monthly amount if omitted',
              },
            },
            required: ['stokvelId'],
          },
          permissionKey: 'finance.write',
          sensitive: true,
          defaultGranted: false,
          // Genuine network-bound XRPL payment (this.xrpl.sendPayment inside
          // FinanceService.contribute) — the one real "this actually takes a
          // few seconds" tool in the registry, so it's the proof case for the
          // backgroundCapable path (see ActionExecutorService.execute()).
          backgroundCapable: true,
          handler: (ctx, input) =>
            this.finance.contribute(
              input.stokvelId,
              ctx.userId,
              input.amountXrp ? Number(input.amountXrp) : undefined,
            ),
          describeAction: (input) =>
            `Contribute ${input.amountXrp ?? 'the standard amount'} XRP to stokvel ${input.stokvelId}`,
          describeResult: () => 'Contribution made.',
        },
        {
          name: 'createFundingRequest',
          description:
            'Create a funding request for a stokvel the user belongs to, for members to vote on. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              stokvelId: { type: 'string' },
              title: { type: 'string' },
              amountXrp: { type: 'number' },
              recipientAddress: { type: 'string' },
            },
            required: ['stokvelId', 'title', 'amountXrp'],
          },
          permissionKey: 'finance.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.finance.createRequest(input.stokvelId, ctx.userId, input),
          describeAction: (input) =>
            `Create a funding request "${input.title}" for ${input.amountXrp} XRP on stokvel ${input.stokvelId}`,
          describeResult: () => 'Funding request created.',
        },
        {
          name: 'voteOnRequest',
          description:
            'Vote to approve or reject a stokvel funding request. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              choice: { type: 'string', description: 'APPROVE or REJECT' },
            },
            required: ['requestId', 'choice'],
          },
          permissionKey: 'finance.write',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.finance.vote(input.requestId, ctx.userId, input.choice),
          describeAction: (input) =>
            `Vote ${input.choice} on funding request ${input.requestId}`,
          describeResult: (input) =>
            `Voted ${input.choice} on request ${input.requestId}.`,
        },
      ]),
    );
  }
}
