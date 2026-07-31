import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateStokvelDto } from './dto/create-stokvel.dto';
import { ContributeDto } from './dto/contribute.dto';
import { CreateFundingRequestDto } from './dto/create-request.dto';
import { VoteDto } from './dto/vote.dto';

// Money-moving endpoints below carry their own @UsePipes(ValidationPipe) —
// applied per-route, not at the controller level, since most of this
// controller's other routes still take a plain `body: any` (not yet
// migrated — see docs/ARCHITECTURE_RECOMMENDATIONS.md #4).
@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Post('stokvels')
  createStokvel(@Request() req: any, @Body() body: CreateStokvelDto) {
    return this.finance.createStokvel(req.user.userId, body);
  }

  @Get('stokvels/mine')
  myStokvels(@Request() req: any) {
    return this.finance.myStokvels(req.user.userId);
  }

  @Get('stokvels')
  listStokvels(@Query('category') category?: string) {
    return this.finance.listStokvels(category);
  }

  @Get('stokvels/:id')
  getStokvel(@Request() req: any, @Param('id') id: string) {
    return this.finance.getStokvel(id, req.user.userId);
  }

  @Post('stokvels/:id/join')
  joinStokvel(@Request() req: any, @Param('id') id: string) {
    return this.finance.joinStokvel(id, req.user.userId);
  }

  @Post('stokvels/:id/members/:memberId/promote')
  promoteMember(
    @Request() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.finance.promoteMember(id, req.user.userId, memberId);
  }

  @Post('stokvels/:id/activate-multisig')
  activateMultisig(@Request() req: any, @Param('id') id: string) {
    return this.finance.activateMultisig(id, req.user.userId);
  }

  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Post('stokvels/:id/contribute')
  contribute(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: ContributeDto,
  ) {
    return this.finance.contribute(id, req.user.userId, body?.amountXrp);
  }

  @Get('stokvels/:id/contributions/mine')
  myContributions(@Request() req: any, @Param('id') id: string) {
    return this.finance.myContributions(id, req.user.userId);
  }

  @Get('stokvels/:id/contributions')
  listContributions(@Request() req: any, @Param('id') id: string) {
    return this.finance.listContributions(id, req.user.userId);
  }

  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Post('stokvels/:id/requests')
  createRequest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: CreateFundingRequestDto,
  ) {
    return this.finance.createRequest(id, req.user.userId, body);
  }

  @Get('stokvels/:id/requests')
  listRequests(@Request() req: any, @Param('id') id: string) {
    return this.finance.listRequests(id, req.user.userId);
  }

  @Get('stokvels/:id/report')
  getReport(@Request() req: any, @Param('id') id: string) {
    return this.finance.getReport(id, req.user.userId);
  }

  @Get('stokvels/:id/audit-log')
  getAuditLog(@Request() req: any, @Param('id') id: string) {
    return this.finance.getAuditLog(id, req.user.userId);
  }

  @Get('requests/:id')
  getRequest(@Request() req: any, @Param('id') id: string) {
    return this.finance.getRequest(id, req.user.userId);
  }

  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Post('requests/:id/vote')
  vote(@Request() req: any, @Param('id') id: string, @Body() body: VoteDto) {
    return this.finance.vote(id, req.user.userId, body.choice);
  }

  @Post('requests/:id/sign')
  signRequest(@Request() req: any, @Param('id') id: string) {
    return this.finance.signRequest(id, req.user.userId);
  }
}
