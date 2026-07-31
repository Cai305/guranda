import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('me')
  me(@Request() req: any) {
    return this.verificationService.me(req.user.userId);
  }

  @Post('submit')
  submit(@Request() req: any, @Body() body: any) {
    return this.verificationService.submit(req.user.userId, body);
  }
}

// Was fully unauthenticated — anyone could approve or reject any user's KYC
// verification, which gates wallet/creator-fund access. Gated the same way
// as the rest of the admin surface (see admin/admin-access.guard.ts).
@UseGuards(AdminAccessGuard)
@Controller('admin/verifications')
export class AdminVerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  queue(@Query('status') status?: string) {
    return this.verificationService.listQueue(status);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    const result = await this.verificationService.approve(id);
    await this.audit.log(req.admin, 'verification.approve', {
      type: 'Verification',
      id,
    });
    return result;
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: any,
  ) {
    const result = await this.verificationService.reject(id, body.reason);
    await this.audit.log(
      req.admin,
      'verification.reject',
      { type: 'Verification', id },
      { reason: body.reason },
    );
    return result;
  }
}
