import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { PostsService } from './posts.service';

@Injectable()
export class PostsAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private posts: PostsService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('posts', [
        {
          name: 'feed',
          description:
            'Read the main social feed (ranked by recency, reputation, and proximity).',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'posts.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.posts.getFeed(ctx.userId).then((r) => r.posts),
          describeResult: (_i, output: any[]) =>
            output.length === 0
              ? 'Feed is empty.'
              : `${output.length} post(s). Most recent: "${output[0]?.content?.slice(0, 80)}"`,
        },
        {
          name: 'create',
          description:
            'Create a text post (optionally with an already-hosted media URL) on the social feed.',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              mediaUrl: { type: 'string' },
              mediaType: { type: 'string' },
            },
            required: ['content'],
          },
          permissionKey: 'posts.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.posts.createPost(
              ctx.userId,
              input.content,
              input.mediaUrl ? [{ url: input.mediaUrl, type: input.mediaType ?? 'IMAGE' }] : undefined,
            ),
          describeResult: () => 'Post created.',
        },
        {
          name: 'like',
          description: 'Like a post by id.',
          inputSchema: {
            type: 'object',
            properties: { postId: { type: 'string' } },
            required: ['postId'],
          },
          permissionKey: 'posts.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.posts.likePost(ctx.userId, input.postId),
          describeResult: () => 'Liked.',
        },
        {
          name: 'comment',
          description: 'Add a comment to a post.',
          inputSchema: {
            type: 'object',
            properties: {
              postId: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['postId', 'content'],
          },
          permissionKey: 'posts.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.posts.addComment(ctx.userId, input.postId, input.content),
          describeResult: () => 'Comment added.',
        },
      ]),
    );
  }
}
