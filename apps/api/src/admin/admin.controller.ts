import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuditService } from './admin-audit.service';

// Accepts either the legacy shared ADMIN_API_KEY (the website ops dashboard's
// current auth) or a Bearer JWT for a User with role=ADMIN — see
// admin-access.guard.ts for why both are supported.
@UseGuards(AdminAccessGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users/:id/suspend')
  async suspendUser(@Param('id') id: string, @Request() req: any) {
    const result = await this.adminService.suspendUser(id);
    await this.audit.log(req.admin, 'user.suspend', { type: 'User', id });
    return result;
  }

  @Post('users/:id/unsuspend')
  async unsuspendUser(@Param('id') id: string, @Request() req: any) {
    const result = await this.adminService.unsuspendUser(id);
    await this.audit.log(req.admin, 'user.unsuspend', { type: 'User', id });
    return result;
  }

  @Get('gaming')
  getActiveGames() {
    return this.adminService.getActiveGames();
  }

  @Get('rides')
  getRides() {
    return this.adminService.getRides();
  }

  @Get('cards/reports')
  getCardReports(@Query('status') status?: string) {
    return this.adminService.getCardReports(status ?? 'open');
  }

  @Post('cards/reports/:id/resolve')
  async resolveCardReport(
    @Param('id') id: string,
    @Body() body: { status?: 'reviewed' | 'actioned' | 'dismissed' },
    @Request() req: any,
  ) {
    const result = await this.adminService.resolveCardReport(id, body.status ?? 'reviewed', req.admin?.adminId ?? null);
    await this.audit.log(req.admin, 'cards.report.resolve', { type: 'PlayerReport', id });
    return result;
  }

  @Get('cards/tournaments')
  getCardTournaments() {
    return this.adminService.getCardTournaments();
  }

  @Get('cards/analytics')
  getCardsAnalytics() {
    return this.adminService.getCardsAnalytics();
  }

  @Get('live')
  getLiveRooms() {
    return this.adminService.getLiveRooms();
  }

  @Get('stories')
  getStoryMetrics() {
    return this.adminService.getStoryMetrics();
  }

  @Get('economy')
  getEconomy() {
    return this.adminService.getEconomy();
  }

  @Get('ai-usage')
  getAiUsage() {
    return this.adminService.getAiUsage();
  }

  @Get('revenue')
  getRevenue() {
    return this.adminService.getRevenue();
  }

  @Get('discovery')
  getDiscovery() {
    return this.adminService.getDiscovery();
  }

  @Get('health')
  getHealth() {
    return this.adminService.getHealth();
  }
}
