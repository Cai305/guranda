import { Controller, Get, Post, Param, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Request() req: any, @Query('unread') unread?: string) {
    return this.notifications.listForUser(req.user.userId, unread === 'true');
  }

  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.notifications.unreadCount(req.user.userId);
  }

  @Post(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.notifications.markRead(req.user.userId, id);
  }

  @Post('read-all')
  markAllRead(@Request() req: any) {
    return this.notifications.markAllRead(req.user.userId);
  }
}
