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
}
