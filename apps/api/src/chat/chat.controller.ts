import {
  Controller,
  Get,
  Post,
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

  @Get(':id/messages')
  async getChatMessages(@Param('id') chatId: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.chatService.getMessages(chatId, userId);
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
}
