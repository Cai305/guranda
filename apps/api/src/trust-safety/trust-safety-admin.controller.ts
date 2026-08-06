import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { TrustSafetyService } from './trust-safety.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';

@UseGuards(AdminAccessGuard)
@Controller('admin/trust-safety')
export class TrustSafetyAdminController {
  constructor(private readonly trustSafety: TrustSafetyService) {}

  @Get('flags')
  listFlags(@Query('status') status?: string) {
    return this.trustSafety.listFlags(status);
  }

  @Post('flags/:id/review')
  review(@Param('id') id: string, @Body() body: { status: 'REVIEWED' | 'DISMISSED' }) {
    return this.trustSafety.review(id, body.status);
  }
}
