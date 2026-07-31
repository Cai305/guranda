import { Controller, Get, Post, Delete, Param, Body, Request, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { FriendsService } from './friends.service';
import { PrismaService } from '../prisma.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly friends: FriendsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async listFriends(@Request() req: any) {
    return this.friends.listFriends(req.user.userId);
  }

  @Get('pending')
  async listPending(@Request() req: any) {
    return this.friends.listPending(req.user.userId);
  }

  @Post('request')
  async sendRequest(@Request() req: any, @Body() body: { username?: string; userId?: string }) {
    let addresseeId = body.userId;
    if (!addresseeId && body.username) {
      const user = await this.prisma.user.findUnique({ where: { username: body.username.replace(/^@/, '') } });
      if (!user) throw new NotFoundException('User not found');
      addresseeId = user.id;
    }
    if (!addresseeId) throw new BadRequestException('username or userId is required');
    return this.friends.sendRequest(req.user.userId, addresseeId);
  }

  @Post(':id/accept')
  async accept(@Request() req: any, @Param('id') id: string) {
    return this.friends.acceptRequest(id, req.user.userId);
  }

  @Post(':id/decline')
  async decline(@Request() req: any, @Param('id') id: string) {
    return this.friends.declineRequest(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.friends.removeFriend(id, req.user.userId);
  }
}
