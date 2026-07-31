import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { TurboRacingService } from './turbo-racing.service';
import type { UpgradeStat } from '@mxit2/types';

@Controller('turbo-racing')
@UseGuards(JwtAuthGuard)
export class TurboRacingController {
  constructor(private readonly turboRacingService: TurboRacingService) {}

  @Get(':id')
  async getRace(@Param('id') id: string) {
    const race = await this.turboRacingService.getRace(id);
    if (!race) throw new NotFoundException('Race not found');
    return race;
  }

  @Get('upgrades/me')
  async getMyUpgrades(@Request() req: any) {
    return this.turboRacingService.getUpgrades(req.user.userId);
  }

  @Post('upgrades/buy')
  async buyUpgrade(@Request() req: any, @Body() body: { stat: UpgradeStat }) {
    return this.turboRacingService.buyUpgrade(req.user.userId, body.stat);
  }

  @Post('upgrades/color')
  async setColor(@Request() req: any, @Body() body: { color: string }) {
    return this.turboRacingService.setColor(req.user.userId, body.color);
  }
}
