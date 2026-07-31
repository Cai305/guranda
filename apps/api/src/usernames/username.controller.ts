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
} from '@nestjs/common';
import { UsernameService } from './username.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('usernames')
export class UsernameController {
  constructor(private readonly usernameService: UsernameService) {}

  // Public and unguarded on purpose — used for real-time availability
  // feedback on RegisterScreen.tsx, before the user has any JWT at all.
  @Get('check')
  check(@Query('label') label: string) {
    return this.usernameService.checkAvailability(label || '');
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Request() req: any) {
    return this.usernameService.mine(req.user.userId);
  }

  @Get('browse')
  @UseGuards(JwtAuthGuard)
  browse(@Query('search') search?: string) {
    return this.usernameService.browse({ search });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOne(@Param('id') id: string) {
    return this.usernameService.getListing(id);
  }

  @Post('mint')
  @UseGuards(JwtAuthGuard)
  mint(@Request() req: any, @Body() body: { label: string }) {
    return this.usernameService.claimAdditional(req.user.userId, body.label);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  activate(@Request() req: any, @Param('id') id: string) {
    return this.usernameService.activate(req.user.userId, id);
  }

  @Post(':id/listing')
  @UseGuards(JwtAuthGuard)
  createListing(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: { listingType?: string; price: number; durationHours?: number },
  ) {
    return this.usernameService.createListing(req.user.userId, id, body);
  }

  @Delete(':id/listing')
  @UseGuards(JwtAuthGuard)
  cancelListing(@Request() req: any, @Param('id') id: string) {
    return this.usernameService.cancelListing(req.user.userId, id);
  }

  @Post(':id/buy')
  @UseGuards(JwtAuthGuard)
  buyNow(@Request() req: any, @Param('id') id: string) {
    return this.usernameService.buyNow(req.user.userId, id);
  }

  @Post(':id/bid')
  @UseGuards(JwtAuthGuard)
  placeBid(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.usernameService.placeBid(
      req.user.userId,
      id,
      Number(body.amount),
    );
  }
}
