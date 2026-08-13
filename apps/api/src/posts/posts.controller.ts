import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  getFeed(
    @Request() req: any,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.getFeed(req.user?.userId, take ? Number(take) : undefined, cursor);
  }

  // Literal routes before any ':id'-style route below, so Nest doesn't try
  // to match "mine"/"following" as a post id.
  @Get('mine/stats')
  getMyStats(@Request() req: any) {
    return this.postsService.getMyStats(req.user.userId);
  }

  @Get('following')
  getFollowingFeed(
    @Request() req: any,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.getFollowingFeed(req.user.userId, take ? Number(take) : undefined, cursor);
  }

  @Get('user/:userId')
  getUserPosts(
    @Param('userId') userId: string,
    @Request() req: any,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.getUserPosts(userId, req.user?.userId, take ? Number(take) : undefined, cursor);
  }

  // TEMPORARY — see PostsService.backfillLegacyMedia. Remove once the
  // legacy Post.mediaUrl/mediaType columns are dropped.
  @Post('admin/backfill-media')
  backfillLegacyMedia() {
    return this.postsService.backfillLegacyMedia();
  }

  @Get(':id')
  getPost(@Param('id') postId: string, @Request() req: any) {
    return this.postsService.getPost(postId, req.user?.userId);
  }

  @Post()
  createPost(
    @Request() req: any,
    @Body() body: {
      content: string;
      // One or more already-uploaded media items, in display order.
      media?: { url: string; type: string; thumbnailUrl?: string }[];
      // Already-resolved references the client's mention-picker attached,
      // e.g. [{ targetType: 'user', targetId: '...' }] — see MentionsService.
      mentions?: { targetType: string; targetId: string }[];
    },
  ) {
    return this.postsService.createPost(
      req.user.userId,
      body.content,
      body.media,
      body.mentions,
    );
  }

  @Post(':id/like')
  likePost(@Request() req: any, @Param('id') postId: string) {
    return this.postsService.likePost(req.user.userId, postId);
  }

  @Post(':id/repost')
  repostPost(@Request() req: any, @Param('id') postId: string) {
    return this.postsService.repostPost(req.user.userId, postId);
  }

  @Post(':id/bookmark')
  bookmarkPost(@Request() req: any, @Param('id') postId: string) {
    return this.postsService.bookmarkPost(req.user.userId, postId);
  }

  @Post(':id/view')
  recordView(@Param('id') postId: string) {
    return this.postsService.recordView(postId);
  }

  @Post(':id/comments')
  addComment(
    @Request() req: any,
    @Param('id') postId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.postsService.addComment(req.user.userId, postId, body.content, body.parentId);
  }

  @Post('comments/:commentId/like')
  likeComment(@Request() req: any, @Param('commentId') commentId: string) {
    return this.postsService.likeComment(req.user.userId, commentId);
  }
}
