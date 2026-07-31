import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CarwashService } from './carwash.service';

@Controller('carwash')
@UseGuards(JwtAuthGuard)
export class CarwashController {
  constructor(private readonly carwashService: CarwashService) {}

  @Get()
  async listCarWashes() {
    return this.carwashService.listCarWashes();
  }

  @Get('mine/bookings')
  async getMyBookings(@Request() req: any) {
    return this.carwashService.getMyBookings(req.user.userId);
  }

  @Get(':id')
  async getCarWash(@Param('id') id: string) {
    return this.carwashService.getCarWash(id);
  }

  @Post()
  async createCarWash(@Request() req: any, @Body() body: any) {
    return this.carwashService.createCarWash(req.user.userId, body);
  }

  @Post(':id/book')
  async bookCarWash(@Request() req: any, @Param('id') carWashId: string, @Body() body: { serviceId: string; scheduledFor?: string }) {
    return this.carwashService.bookCarWash(req.user.userId, {
      carWashId,
      serviceId: body.serviceId,
      scheduledFor: body.scheduledFor,
    });
  }
}
