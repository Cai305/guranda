import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';

@UseGuards(AdminAccessGuard)
@Controller('admin/intelligence')
export class IntelligenceAdminController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get('summary')
  summary(@Query('hours') hours?: string) {
    return this.intelligence.platformActivitySummary(hours ? Number(hours) : undefined);
  }
}
