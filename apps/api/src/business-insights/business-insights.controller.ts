import { Body, Controller, Get, Patch, Post, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { BusinessInsightsService } from './business-insights.service';
import { NarrateBusinessInsightsDto, SetAccountTypeDto } from './dto/narrate-business-insights.dto';

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('business-insights')
export class BusinessInsightsController {
  constructor(private readonly businessInsights: BusinessInsightsService) {}

  // The Dashboard's already-computed real stats go in (see
  // MINI_APP_MANAGE_REGISTRY + DashboardScreen's own fetches on the mobile
  // side) — narrated, real-number-only insight sentences come out.
  @Post('narrate')
  narrate(@Request() req: any, @Body() body: NarrateBusinessInsightsDto) {
    return this.businessInsights.narrate(req.user.userId, body);
  }

  @Get('account-type')
  async getAccountType(@Request() req: any) {
    const override = await this.businessInsights.getAccountTypeOverride(req.user.userId);
    return { override };
  }

  // Body omitting `accountType` entirely clears the override back to
  // "derived" — this is the "default to the derived value, override is
  // optional" contract from the mobile side's config/accountType.ts.
  @Patch('account-type')
  async setAccountType(@Request() req: any, @Body() body: SetAccountTypeDto) {
    const override = await this.businessInsights.setAccountTypeOverride(req.user.userId, body.accountType);
    return { override };
  }
}
