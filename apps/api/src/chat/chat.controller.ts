import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  async getUserChats(@Request() req: any) {
    const userId = req.user.userId;
    if (!userId) throw new BadRequestException('Missing user id');
    return this.chatService.getUserChats(userId);
  }

  // Registered before ':id/messages' — 'public' would otherwise be parsed as
  // a chat id by that route.
  @Get('public')
  async getPublicChannels() {
    return this.chatService.getPublicChannels();
  }

  @Get(':id/messages')
  async getChatMessages(@Param('id') chatId: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.chatService.getMessages(chatId, userId);
  }

  // Sets the default wallpaper applied to every chat this user has —
  // "for everyone". Pass wallpaperUrl: null to clear it back to the app
  // default.
  @Patch('wallpaper')
  async setGlobalWallpaper(
    @Request() req: any,
    @Body('wallpaperUrl') wallpaperUrl: string | null,
  ) {
    return this.chatService.setGlobalWallpaper(req.user.userId, wallpaperUrl ?? null);
  }

  // Resolved wallpaper for one chat — this chat's own override if set,
  // otherwise the caller's global default.
  @Get(':id/wallpaper')
  async getChatWallpaper(@Param('id') chatId: string, @Request() req: any) {
    return this.chatService.getWallpaper(chatId, req.user.userId);
  }

  // Sets a wallpaper for just this one chat — "for an individual" — this
  // member's row only, doesn't touch the other participant's wallpaper or
  // this user's global default. Pass wallpaperUrl: null to clear the
  // override and fall back to the global default again.
  @Patch(':id/wallpaper')
  async setChatWallpaper(
    @Param('id') chatId: string,
    @Request() req: any,
    @Body('wallpaperUrl') wallpaperUrl: string | null,
  ) {
    return this.chatService.setChatWallpaper(chatId, req.user.userId, wallpaperUrl ?? null);
  }

  @Post('direct')
  async createDirectChat(
    @Request() req: any,
    @Body('targetUserId') targetUserId: string,
  ) {
    const userId = req.user.userId;
    if (!userId || !targetUserId) {
      throw new BadRequestException('Missing userId or targetUserId');
    }
    const chat = await this.chatService.createDirectChat(userId, targetUserId);
    // Both sides need to be in the room immediately, not just whoever opens
    // ChatRoom first — otherwise the other party misses realtime delivery
    // for this chat until their next reconnect.
    this.chatGateway.joinUserSockets(userId, chat.id);
    this.chatGateway.joinUserSockets(targetUserId, chat.id);
    return chat;
  }

  @Post('group')
  async createGroupChat(
    @Request() req: any,
    @Body() body: { name: string; memberUserIds: string[] },
  ) {
    const userId = req.user.userId;
    const chat = await this.chatService.createGroupChat(
      userId,
      body.name,
      body.memberUserIds || [],
    );
    for (const member of chat.members)
      this.chatGateway.joinUserSockets(member.userId, chat.id);
    return chat;
  }

  // ── Relationship-partner shared chats ──────────────────────────────────
  // Explicit per-chat opt-in — the owner shares one of their own direct
  // chats with their active relationship partner, who then reads/replies
  // appearing as the owner. The chat's other participant is never told.

  @Post(':id/share')
  async shareChat(
    @Param('id') chatId: string,
    @Request() req: any,
    @Body()
    body: {
      delegateId: string;
      canRead?: boolean;
      canWrite?: boolean;
      canUpdateMessages?: boolean;
      canDeleteMessages?: boolean;
    },
  ) {
    const ownerId = req.user.userId;
    if (!body?.delegateId) throw new BadRequestException('Missing delegateId');
    const share = await this.chatService.shareChat(ownerId, chatId, body.delegateId, {
      canRead: body.canRead,
      canWrite: body.canWrite,
      canUpdateMessages: body.canUpdateMessages,
      canDeleteMessages: body.canDeleteMessages,
    });
    // The delegate needs to be in this chat's room immediately, not just on
    // their next reconnect — same reasoning as createDirectChat above.
    this.chatGateway.joinUserSockets(body.delegateId, chatId);
    return share;
  }

  @Post(':id/unshare')
  async unshareChat(
    @Param('id') chatId: string,
    @Request() req: any,
    @Body('delegateId') delegateId: string,
  ) {
    const ownerId = req.user.userId;
    if (!delegateId) throw new BadRequestException('Missing delegateId');
    return this.chatService.unshareChat(ownerId, chatId, delegateId);
  }

  @Get(':id/shares')
  async getChatShares(@Param('id') chatId: string, @Request() req: any) {
    return this.chatService.getChatShares(chatId, req.user.userId);
  }
}
