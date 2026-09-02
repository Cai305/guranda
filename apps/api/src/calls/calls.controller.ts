import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CallService } from './call.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly calls: CallService) {}

  @Get('log')
  async getLog(
    @Request() req: any,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.calls.getLog(req.user.userId, take ? parseInt(take, 10) : undefined, cursor);
  }
}
