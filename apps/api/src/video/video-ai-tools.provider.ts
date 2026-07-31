import { Injectable, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { defineTools } from '../tool-registry/define-tools';
import { VideoService } from './video.service';

@Injectable()
export class VideoAiToolsProvider implements OnModuleInit {
  constructor(
    private registry: ToolRegistryService,
    private video: VideoService,
  ) {}

  onModuleInit() {
    this.registry.registerMany(
      defineTools('video', [
        {
          name: 'feed',
          description: "Read the user's personalized video feed.",
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'video.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.video.getFeed(ctx.userId),
          describeResult: (_i, output: any[]) =>
            `${output.length} video(s) in feed.`,
        },
        {
          name: 'trending',
          description: 'List trending videos by view count.',
          inputSchema: { type: 'object', properties: {} },
          permissionKey: 'video.read',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx) => this.video.getTrending(ctx.userId),
        },
        {
          name: 'like',
          description: 'Like a video.',
          inputSchema: {
            type: 'object',
            properties: { videoId: { type: 'string' } },
            required: ['videoId'],
          },
          permissionKey: 'video.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.video.likeVideo(input.videoId, ctx.userId),
          describeResult: () => 'Liked.',
        },
        {
          name: 'addToPlaylist',
          description: "Add a video to one of the user's playlists.",
          inputSchema: {
            type: 'object',
            properties: {
              playlistId: { type: 'string' },
              videoId: { type: 'string' },
            },
            required: ['playlistId', 'videoId'],
          },
          permissionKey: 'video.write',
          sensitive: false,
          defaultGranted: true,
          handler: (ctx, input) =>
            this.video.addToPlaylist(
              input.playlistId,
              input.videoId,
              ctx.userId,
            ),
          describeResult: () => 'Added to playlist.',
        },
      ]),
    );
  }
}
