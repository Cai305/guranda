import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Single round trip for the redesigned Profile screen — pillars +
  // companion + badges together, same aggregation pattern GET /users/me
  // already uses for its own fields.
  @Get('me/hq')
  async getMyHQ(@Request() req: any) {
    return this.profileService.getHQ(req.user.userId);
  }

  @Patch('me/companion')
  async renameCompanion(@Request() req: any, @Body('name') name: string) {
    return this.profileService.renameCompanion(req.user.userId, name);
  }

  // Real cross-mini-app "what have I got coming up" — the "My Bookings"
  // zone on the redesigned Profile screen.
  @Get('me/bookings')
  async getMyBookings(@Request() req: any) {
    return this.profileService.getMyBookings(req.user.userId);
  }

  // Real per-game history for the "My Mini Apps" zone — was a hardcoded
  // fake array before.
  @Get('me/game-stats')
  async getMyGameStats(@Request() req: any) {
    return this.profileService.getMyGameStats(req.user.userId);
  }

  // Creator Growth — real trend over time, not a static number.
  @Get('me/growth')
  async getMyGrowth(@Request() req: any) {
    return this.profileService.getMyGrowth(req.user.userId);
  }
}
