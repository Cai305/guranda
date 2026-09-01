import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('communities')
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  findAll() {
    return this.communitiesService.findAll();
  }

  @Get('browse')
  browse(@Request() req: any, @Query('query') query?: string, @Query('category') category?: string) {
    return this.communitiesService.browseCommunities(req.user.userId, query, category);
  }

  @Get('my')
  findMyCommunities(@Request() req: any) {
    return this.communitiesService.findUserCommunities(req.user.userId);
  }

  // Must be registered before ':id' so 'invites' isn't parsed as a community id.
  @Post('invites/:code/redeem')
  redeemInvite(@Request() req: any, @Param('code') code: string) {
    return this.communitiesService.redeemInvite(req.user.userId, code);
  }

  @Get(':id')
  getCommunityDetails(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.getCommunityDetails(id, req.user.userId);
  }

  @Patch(':id')
  updateCommunity(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      iconUrl?: string;
      coverUrl?: string;
      category?: string;
      privacy?: 'PUBLIC' | 'PRIVATE';
    },
  ) {
    return this.communitiesService.updateCommunity(id, req.user.userId, body);
  }

  @Delete(':id')
  deleteCommunity(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.deleteCommunity(id, req.user.userId);
  }

  @Post(':id/join')
  joinCommunity(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.joinCommunity(req.user.userId, id);
  }

  @Post(':id/leave')
  leaveCommunity(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.leaveCommunity(id, req.user.userId);
  }

  @Post()
  createCommunity(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      description?: string;
      iconUrl?: string;
      coverUrl?: string;
      category?: string;
      privacy?: 'PUBLIC' | 'PRIVATE';
    },
  ) {
    return this.communitiesService.createCommunity(
      req.user.userId,
      body.name,
      body.description,
      body.iconUrl,
      body.coverUrl,
      body.category,
      body.privacy,
    );
  }

  // ── Members & roles ──────────────────────────────────────────────────
  @Get(':id/members')
  listMembers(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.listMembers(id, req.user.userId);
  }

  @Patch(':id/members/:userId/role')
  setMemberRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('role') role: 'ADMIN' | 'MOD' | 'MEMBER',
  ) {
    return this.communitiesService.setMemberRole(id, req.user.userId, userId, role);
  }

  @Delete(':id/members/:userId')
  removeMember(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.communitiesService.removeMember(id, req.user.userId, userId);
  }

  // ── Channels ──────────────────────────────────────────────────────────
  @Post(':id/channels')
  createChannel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string; channelType: string },
  ) {
    return this.communitiesService.createChannel(id, req.user.userId, body.name, body.channelType || 'TEXT');
  }

  @Patch(':id/channels/:channelId')
  renameChannel(
    @Request() req: any,
    @Param('id') id: string,
    @Param('channelId') channelId: string,
    @Body('name') name: string,
  ) {
    return this.communitiesService.renameChannel(id, req.user.userId, channelId, name);
  }

  @Delete(':id/channels/:channelId')
  deleteChannel(@Request() req: any, @Param('id') id: string, @Param('channelId') channelId: string) {
    return this.communitiesService.deleteChannel(id, req.user.userId, channelId);
  }

  @Post(':id/channels/:channelId/voice/join')
  joinVoiceChannel(
    @Request() req: any,
    @Param('id') id: string,
    @Param('channelId') channelId: string,
  ) {
    const displayName = req.user.displayName || req.user.username || 'Someone';
    return this.communitiesService.joinVoiceChannel(id, req.user.userId, displayName, channelId);
  }

  // ── Feed ──────────────────────────────────────────────────────────────
  @Get(':id/posts')
  listPosts(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.listPosts(id, req.user.userId);
  }

  @Post(':id/posts')
  createPost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { content: string; mediaUrl?: string },
  ) {
    return this.communitiesService.createPost(id, req.user.userId, body.content, body.mediaUrl);
  }

  @Delete(':id/posts/:postId')
  deletePost(@Request() req: any, @Param('id') id: string, @Param('postId') postId: string) {
    return this.communitiesService.deletePost(id, req.user.userId, postId);
  }

  @Post(':id/posts/:postId/like')
  toggleLike(@Request() req: any, @Param('id') id: string, @Param('postId') postId: string) {
    return this.communitiesService.toggleLike(id, req.user.userId, postId);
  }

  @Get(':id/posts/:postId/comments')
  listComments(@Param('id') id: string, @Param('postId') postId: string) {
    return this.communitiesService.listComments(id, postId);
  }

  @Post(':id/posts/:postId/comments')
  addComment(
    @Request() req: any,
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Body('content') content: string,
  ) {
    return this.communitiesService.addComment(id, req.user.userId, postId, content);
  }

  // ── Pinned apps & games ──────────────────────────────────────────────
  @Post(':id/pinned-apps')
  pinApp(@Request() req: any, @Param('id') id: string, @Body('appId') appId: string) {
    return this.communitiesService.pinApp(id, req.user.userId, appId);
  }

  @Delete(':id/pinned-apps/:appId')
  unpinApp(@Request() req: any, @Param('id') id: string, @Param('appId') appId: string) {
    return this.communitiesService.unpinApp(id, req.user.userId, appId);
  }

  // ── Invites ───────────────────────────────────────────────────────────
  @Post(':id/invites')
  createInvite(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { expiresAt?: string; maxUses?: number },
  ) {
    return this.communitiesService.createInvite(id, req.user.userId, body);
  }

  @Get(':id/invites')
  listInvites(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.listInvites(id, req.user.userId);
  }

  @Delete(':id/invites/:code')
  revokeInvite(@Request() req: any, @Param('id') id: string, @Param('code') code: string) {
    return this.communitiesService.revokeInvite(id, req.user.userId, code);
  }

  @Post(':id/invite-user')
  inviteUser(@Request() req: any, @Param('id') id: string, @Body('userId') targetUserId: string) {
    return this.communitiesService.inviteUser(id, req.user.userId, targetUserId);
  }
}
