import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('my-code')
  async myCode(@Request() req: any) {
    const code = await this.referrals.ensureReferralCode(req.user.userId);
    return { code };
  }

  @Get('mine')
  async listMine(@Request() req: any) {
    return this.referrals.listMine(req.user.userId);
  }

  @Post('redeem')
  async redeem(@Request() req: any, @Body() body: { code: string }) {
    return this.referrals.redeem(req.user.userId, body.code);
  }
}
