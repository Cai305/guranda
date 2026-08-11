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
import { LiveReportsService } from './live-reports.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AdminAccessGuard } from '../admin/admin-access.guard';

@Controller('live/reports')
export class LiveReportsController {
  constructor(private readonly liveReportsService: LiveReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:roomId')
  async createReport(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Body() body: { reportedUserId: string; reason: string; details?: string },
  ) {
    return this.liveReportsService.createReport(
      req.user.userId,
      roomId,
      body.reportedUserId,
      body.reason,
      body.details,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyReports() {
    return this.liveReportsService.listReports();
  }
}

@Controller('admin/live/reports')
@UseGuards(AdminAccessGuard)
export class AdminLiveReportsController {
  constructor(private readonly liveReportsService: LiveReportsService) {}

  @Get()
  async listReports(@Query('status') status?: string) {
    return this.liveReportsService.listReports(status);
  }

  @Get(':id')
  async getReport(@Param('id') id: string) {
    return this.liveReportsService.getReport(id);
  }

  @Post(':id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @Body() body: { status?: 'reviewed' | 'actioned' | 'dismissed' },
    @Request() req: any,
  ) {
    return this.liveReportsService.resolveReport(id, body.status ?? 'reviewed', req.admin.adminId);
  }
}
