import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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

  // ── Owner CRUD ─────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  getMyProfile(@Req() req: any) {
    return this.hairService.getMyProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mine')
  createMyProfile(
    @Req() req: any,
    @Body() body: { businessName: string; bio?: string; lat: number; lng: number; address?: string },
  ) {
    return this.hairService.createMyProfile(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine')
  updateMyProfile(@Req() req: any, @Body() body: any) {
    return this.hairService.updateMyProfile(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mine/services')
  addService(@Req() req: any, @Body() body: any) {
    return this.hairService.addService(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/services/:id')
  updateService(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.hairService.updateService(req.user.userId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mine/services/:id')
  deleteService(@Req() req: any, @Param('id') id: string) {
    return this.hairService.deleteService(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mine/products')
  addProduct(@Req() req: any, @Body() body: any) {
    return this.hairService.addProduct(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/products/:id')
  updateProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.hairService.updateProduct(req.user.userId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('mine/products/:id')
  deleteProduct(@Req() req: any, @Param('id') id: string) {
    return this.hairService.deleteProduct(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mine/bookings/:id')
  updateBookingStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: any) {
    return this.hairService.updateBookingStatus(req.user.userId, id, status);
  }

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
