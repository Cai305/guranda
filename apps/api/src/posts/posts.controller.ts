import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
  getFeed(@Request() req: any) {
    return this.postsService.getFeed(req.user?.userId);
  }

  // Literal routes before any ':id'-style route below, so Nest doesn't try
  // to match "mine"/"following" as a post id.
  @Get('mine/stats')
  getMyStats(@Request() req: any) {
    return this.postsService.getMyStats(req.user.userId);
  }

  @Get('following')
  getFollowingFeed(@Request() req: any) {
    return this.postsService.getFollowingFeed(req.user.userId);
  }

  @Get(':id')
  getPost(@Param('id') postId: string, @Request() req: any) {
    return this.postsService.getPost(postId, req.user?.userId);
  }

  @Post()
  createPost(
    @Request() req: any,
    @Body() body: { content: string; mediaUrl?: string; mediaType?: string },
  ) {
    return this.postsService.createPost(
      req.user.userId,
      body.content,
      body.mediaUrl,
      body.mediaType,
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
