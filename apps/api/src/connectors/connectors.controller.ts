import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ConnectorsService } from './connectors.service';

// Real connector state — never fakes a connected/configured platform. See
// connectors.service.ts for how isConfigured is derived.
@Controller('connectors')
@UseGuards(JwtAuthGuard)
export class ConnectorsController {
  constructor(private connectors: ConnectorsService) {}

  @Get()
  list() {
    return this.connectors.list();
  }
}
