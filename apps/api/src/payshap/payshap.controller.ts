import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/auth.guard';
import { PayShapService } from './payshap.service';
import { SetPayShapNumberDto } from './dto/set-number.dto';
import { BankIdDto } from './dto/bank-id.dto';
import { SendViaPayShapDto, RequestViaPayShapDto } from './dto/send-via-payshap.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('payshap')
@UseGuards(JwtAuthGuard)
export class PayShapController {
  constructor(private readonly payshap: PayShapService) {}

  @Get('me')
  async getMyProfile(@Request() req: any) {
    return this.payshap.getMyProfile(req.user.userId);
  }

  @Post('number')
  async setNumber(@Request() req: any, @Body() body: SetPayShapNumberDto) {
    return this.payshap.setNumber(req.user.userId, body.number);
  }

  @Post('banks')
  async linkBank(@Request() req: any, @Body() body: BankIdDto) {
    return this.payshap.linkBank(req.user.userId, body.bankId);
  }

  @Delete('banks/:bankId')
  async unlinkBank(@Request() req: any, @Param('bankId') bankId: string) {
    return this.payshap.unlinkBank(req.user.userId, bankId);
  }

  @Post('banks/:bankId/primary')
  async setPrimaryBank(@Request() req: any, @Param('bankId') bankId: string) {
    return this.payshap.setPrimaryBank(req.user.userId, bankId);
  }

  @Get('lookup')
  async lookup(@Request() req: any, @Query('number') number: string) {
    return this.payshap.lookup(req.user.userId, number ?? '');
  }

  @Get('airpay/nearby')
  async nearby(@Request() req: any, @Query('radiusMeters') radiusMeters?: string) {
    return this.payshap.getNearbyForAirPay(req.user.userId, radiusMeters ? Number(radiusMeters) : 50);
  }

  // Money-movement — throttled tighter than the global default, same as the
  // plain wallet send/request endpoints.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('send')
  async send(@Request() req: any, @Body() body: SendViaPayShapDto) {
    return this.payshap.sendViaPayShap(req.user.userId, body.number, body.bankId, body.amount);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('request')
  async requestPayment(@Request() req: any, @Body() body: RequestViaPayShapDto) {
    return this.payshap.requestViaPayShap(req.user.userId, body.number, body.amount, body.memo);
  }
}
