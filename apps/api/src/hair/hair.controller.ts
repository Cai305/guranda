import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HairService } from './hair.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('hair')
export class HairController {
  constructor(private readonly hairService: HairService) {}

  @UseGuards(JwtAuthGuard)
  @Get('search')
  searchHairdressers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('q') query: string,
  ) {
    return this.hairService.searchHairdressers(
      parseFloat(lat),
      parseFloat(lng),
      10,
      query,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dressers/:id')
  getDresser(@Param('id') id: string) {
    return this.hairService.getHairdresserById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('book')
  createBooking(
    @Req() req: any,
    @Body()
    data: {
      hairdresserId: string;
      serviceId: string;
      appointmentAt: string;
      purchasedItemsIds: string[];
    },
  ) {
    return this.hairService.createBooking(req.user.userId, data);
  }

  // Was completely unauthenticated — any visitor, logged in or not, could
  // trigger this. Login is enough here (it's idempotent and demo-only, not
  // worth a full admin-key gate), but it shouldn't be reachable by anyone
  // with zero relationship to the app at all.
  @UseGuards(JwtAuthGuard)
  @Post('seed')
  seed() {
    return this.hairService.seedTestHairdresser();
  }
}
