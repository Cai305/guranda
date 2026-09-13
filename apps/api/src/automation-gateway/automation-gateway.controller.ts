import { Controller, Get, Post, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AutomationGatewayService } from './automation-gateway.service';

@UseGuards(JwtAuthGuard)
@Controller('automation-gateway')
export class AutomationGatewayController {
  constructor(private gateway: AutomationGatewayService) {}

  // Must come before ':id' equivalents so Nest doesn't treat a literal path
  // segment as a route param — matches the ordering convention used in
  // blueprints.controller.ts ('mine'/'runs' before ':id').
  @Get('executions')
  listExecutions(@Query('workflowKey') workflowKey: string | undefined, @Request() req: any) {
    return this.gateway.listExecutions(req.user.userId, workflowKey);
  }

  @Get('executions/:id')
  getExecution(@Param('id') id: string, @Request() req: any) {
    return this.gateway.getExecution(req.user.userId, id);
  }

  @Post('executions/:id/cancel')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.gateway.cancel(req.user.userId, id);
  }
}
