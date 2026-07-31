import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RegisterUserValidatedDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SavePushTokenDto } from './dto/push-token.dto';
import { SaveLocationDto } from './dto/save-location.dto';

// Scoped (not global — see docs/ARCHITECTURE_RECOMMENDATIONS.md #4) so this
// doesn't affect the ~50 other controllers still using plain-interface
// request bodies. whitelist+forbidNonWhitelisted reject any request
// carrying fields the DTO doesn't declare, instead of silently ignoring or
// (worse) passing them through to a service method.
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Tighter than the app-wide default (see app.module.ts) — these are the
  // realistic credential-stuffing/brute-force/account-farming targets.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterUserValidatedDto) {
    return this.usersService.registerUser(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.usersService.loginUser(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('push-token')
  async savePushToken(@Request() req: any, @Body() body: SavePushTokenDto) {
    return this.usersService.savePushToken(req.user.userId, body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('location')
  async saveLocation(@Request() req: any, @Body() body: SaveLocationDto) {
    return this.usersService.saveLocation(
      req.user.userId,
      body.lat,
      body.lng,
      body.label,
    );
  }

  // Resolves a contact-add deep link by stable userId rather than by
  // username string — usernames are reassignable/tradeable now, so an old
  // shared lifeos://add/<username> link's label could later resolve to a
  // different owner; new links carry ?uid= as a fallback (see
  // AddContactScreen.tsx) which always finds the right person.
  @UseGuards(JwtAuthGuard)
  @Get('by-id/:id')
  async byId(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(@Query('q') query: string, @Request() req: any) {
    const userId = req.user.userId;
    if (!userId) throw new BadRequestException('Missing user id');
    return this.usersService.searchUsers(query, userId);
  }
}
