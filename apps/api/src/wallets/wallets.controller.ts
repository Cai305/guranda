import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';
import { SendMashelenDto } from './dto/send-masheleni.dto';
import { RequestDepositDto } from './dto/request-deposit.dto';
import { DepositAdminNoteDto } from './dto/deposit-admin-note.dto';

// Scoped, not global — see docs/ARCHITECTURE_RECOMMENDATIONS.md #4.
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  async getMyWallet(@Request() req: any) {
    return this.walletsService.getMyWallet(req.user.userId);
  }

  @Post('send')
  async sendMasheleni(@Request() req: any, @Body() body: SendMashelenDto) {
    return this.walletsService.sendMasheleni(
      req.user.userId,
      body.destination,
      body.amount,
    );
  }

  @Post('deposit')
  async requestDeposit(@Request() req: any, @Body() body: RequestDepositDto) {
    return this.walletsService.requestDeposit(req.user.userId, body.amountZar);
  }

  @Get('deposits')
  async listMyDeposits(@Request() req: any) {
    return this.walletsService.listMyDeposits(req.user.userId);
  }
}

// Was fully unauthenticated — anyone could POST /admin/deposits/:id/confirm
// on their own pending deposit and credit their wallet with real-money value
// they never paid, with no auth of any kind required. Gated the same way as
// the rest of the admin surface (see admin/admin-access.guard.ts).
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AdminAccessGuard)
@Controller('admin/deposits')
export class AdminDepositsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  listPending() {
    return this.walletsService.listPendingDeposits();
  }

  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() body: DepositAdminNoteDto,
    @Request() req: any,
  ) {
    const result = await this.walletsService.confirmDeposit(id, body?.adminNote);
    await this.audit.log(
      req.admin,
      'deposit.confirm',
      { type: 'DepositRequest', id },
      { adminNote: body?.adminNote },
    );
    return result;
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: DepositAdminNoteDto,
    @Request() req: any,
  ) {
    const result = await this.walletsService.rejectDeposit(id, body?.adminNote);
    await this.audit.log(
      req.admin,
      'deposit.reject',
      { type: 'DepositRequest', id },
      { adminNote: body?.adminNote },
    );
    return result;
  }
}
