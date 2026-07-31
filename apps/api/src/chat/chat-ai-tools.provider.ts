import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { ChatService } from './chat.service';

@Injectable()
export class ChatAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private chat: ChatService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('chat', [
        {
          name: 'myChats',
          description: "List the user's chat conversations (direct and group).",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'chat.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.chat.getUserChats(ctx.userId),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'No conversations yet.'
              : output.map((c) => c.name).join(', '),
        },
        {
          name: 'messages',
          description: 'Read the messages in a specific chat.',
          inputSchema: {
            type: 'object',
            properties: { chatId: { type: 'string' } },
            required: ['chatId'],
          },
          permissionKey: 'chat.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.chat.getMessages(input.chatId, ctx.userId),
          describeResult: (_i, output: any[]) => `${output.length} message(s).`,
        },
        {
          name: 'startDirect',
          description:
            'Start (or reuse an existing) direct chat with another user by their userId.',
          inputSchema: {
            type: 'object',
            properties: { targetUserId: { type: 'string' } },
            required: ['targetUserId'],
          },
          permissionKey: 'chat.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.chat.createDirectChat(ctx.userId, input.targetUserId),
          describeResult: () => 'Direct chat ready.',
        },
        {
          name: 'sendMessage',
          description: 'Send a message in an existing chat.',
          inputSchema: {
            type: 'object',
            properties: {
              chatId: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['chatId', 'content'],
          },
          permissionKey: 'chat.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.chat.sendMessage(ctx.userId, input.chatId, input.content),
          describeResult: () => 'Message sent.',
        },
      ]),
    );
  }
}
