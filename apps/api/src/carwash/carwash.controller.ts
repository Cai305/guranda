import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
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

  @Get('mine')
  async myCarWashes(@Request() req: any) {
    return this.carwashService.myCarWashes(req.user.userId);
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

  @Patch(':id')
  async updateCarWash(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.carwashService.updateCarWash(id, req.user.userId, body);
  }

  @Delete(':id')
  async deleteCarWash(@Request() req: any, @Param('id') id: string) {
    return this.carwashService.deleteCarWash(id, req.user.userId);
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
