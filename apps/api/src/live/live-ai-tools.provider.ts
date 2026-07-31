import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { LiveService } from './live.service';

// Only viewer-side engagement tools are exposed. Host-management actions
// (launchQuiz/launchPoll/launchPrediction, pinShoppingProduct/pinEatProduct,
// updateScoreboard, resolveQuiz/resolvePrediction, postJob,
// markQuestionAnswered, goLive) only make sense while the user is actively
// hosting a live stream themselves — not a meaningful standalone
// chat-triggered agent action — so they're intentionally left out.
@Injectable()
export class LiveAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private live: LiveService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('live', [
        {
          name: 'discover',
          description:
            'Discover currently live streams (ranked by recency, reputation, and proximity).',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'live.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.live.listLive(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No one is live right now.'
              : output
                  .map((r) => `"${r.title}" hosted by @${r.host?.username}`)
                  .join('\n'),
        },
        {
          name: 'join',
          description:
            'Join a live stream as a viewer (returns a playback token).',
          inputSchema: {
            type: 'object',
            properties: {
              roomId: { type: 'string' },
              userName: { type: 'string' },
            },
            required: ['roomId', 'userName'],
          },
          permissionKey: 'live.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.live.join(input.roomId, ctx.userId, input.userName),
          describeResult: () => 'Joined the stream.',
        },
        {
          name: 'votePoll',
          description: "Vote in a live stream's active poll.",
          inputSchema: {
            type: 'object',
            properties: {
              pollId: { type: 'string' },
              optionIndex: { type: 'number' },
            },
            required: ['pollId', 'optionIndex'],
          },
          permissionKey: 'live.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.live.votePoll(
              ctx.userId,
              input.pollId,
              Number(input.optionIndex),
            ),
          describeResult: () => 'Vote cast.',
        },
        {
          name: 'answerQuiz',
          description: "Answer a live stream's active quiz question.",
          inputSchema: {
            type: 'object',
            properties: {
              quizId: { type: 'string' },
              optionIndex: { type: 'number' },
            },
            required: ['quizId', 'optionIndex'],
          },
          permissionKey: 'live.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.live.answerQuiz(
              ctx.userId,
              input.quizId,
              Number(input.optionIndex),
            ),
          describeResult: () => 'Answer submitted.',
        },
        {
          name: 'applyToJob',
          description:
            "Apply to a job posted on a host's live stream job board.",
          inputSchema: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['jobId'],
          },
          permissionKey: 'live.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.live.applyToJob(ctx.userId, input.jobId, input.message),
          describeResult: () => 'Application submitted.',
        },
        {
          name: 'buyPinnedProduct',
          description:
            'Buy whatever shopping product is currently pinned in a live stream (spends MSH). Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              roomId: { type: 'string' },
              quantity: { type: 'number' },
              shippingAddress: { type: 'string' },
            },
            required: ['roomId', 'shippingAddress'],
          },
          permissionKey: 'live.buy',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.live.buyPinnedProduct(ctx.userId, input.roomId, {
              quantity: input.quantity,
              shippingAddress: input.shippingAddress,
            }),
          describeAction: () => 'Buy the pinned product in this stream',
          describeResult: () => 'Purchase placed.',
        },
        {
          name: 'orderPinnedFood',
          description:
            'Order whatever food item is currently pinned in a live stream (spends MSH). Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              roomId: { type: 'string' },
              quantity: { type: 'number' },
              deliveryAddress: { type: 'string' },
            },
            required: ['roomId', 'deliveryAddress'],
          },
          permissionKey: 'live.buy',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.live.orderPinnedFood(ctx.userId, input.roomId, {
              quantity: input.quantity,
              deliveryAddress: input.deliveryAddress,
            }),
          describeAction: () => 'Order the pinned food in this stream',
          describeResult: () => 'Order placed.',
        },
        {
          name: 'placeBet',
          description:
            'Place a bet (spends MSH) on a live stream prediction. Requires approval.',
          inputSchema: {
            type: 'object',
            properties: {
              predictionId: { type: 'string' },
              pick: { type: 'string', enum: ['A', 'B'] },
              amount: { type: 'number' },
            },
            required: ['predictionId', 'pick', 'amount'],
          },
          permissionKey: 'live.buy',
          sensitive: true,
          defaultGranted: false,
          handler: (ctx, input) =>
            this.live.placeBet(ctx.userId, input.predictionId, {
              pick: input.pick,
              amount: Number(input.amount),
            }),
          describeAction: (input) => `Bet ${input.amount} MSH on ${input.pick}`,
          describeResult: () => 'Bet placed.',
        },
      ]),
    );
  }
}
