import { Body, Controller, Get, Post, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  // Public/unauthenticated — ContextualNewsBanner renders for anyone,
  // logged in or not, the same way any other read-only content surface does.
  @Get()
  list(@Query('contextType') contextType: string, @Query('contextKey') contextKey: string) {
    return this.announcements.list(contextType, contextKey);
  }

  // Business-owner posting an update to their own campaign — MINI_APP
  // context is rejected here, that's admin-only (see AnnouncementsAdminController).
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseGuards(JwtAuthGuard)
  create(@Body() body: CreateAnnouncementDto, @Request() req: any) {
    return this.announcements.createByBusinessOwner(req.user.userId, body);
  }
}
