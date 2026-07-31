import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TravelService } from './travel.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('travel')
@UseGuards(JwtAuthGuard)
export class TravelController {
  constructor(private readonly travelService: TravelService) {}

  // Stays
  @Get('stays')
  listStays(@Query('location') location?: string) {
    return this.travelService.listStays({ location });
  }

  @Get('stays/mine')
  getMyStays(@Request() req: any) {
    return this.travelService.getMyStays(req.user.userId);
  }

  @Get('stays/:id')
  getStay(@Param('id') id: string) {
    return this.travelService.getStay(id);
  }

  @Post('stays')
  createStay(@Request() req: any, @Body() body: any) {
    return this.travelService.createStay(req.user.userId, body);
  }

  @Put('stays/:id')
  updateStay(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.travelService.updateStay(req.user.userId, id, body);
  }

  @Delete('stays/:id')
  deleteStay(@Request() req: any, @Param('id') id: string) {
    return this.travelService.deleteStay(req.user.userId, id);
  }

  @Post('stays/:id/book')
  bookStay(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.travelService.bookStay(req.user.userId, {
      ...body,
      stayId: id,
    });
  }

  // Car Hire
  @Get('cars')
  listCars(
    @Query('category') category?: string,
    @Query('location') location?: string,
  ) {
    return this.travelService.listCars({ category, location });
  }

  @Get('cars/mine')
  getMyCars(@Request() req: any) {
    return this.travelService.getMyCars(req.user.userId);
  }

  @Get('cars/:id')
  getCar(@Param('id') id: string) {
    return this.travelService.getCar(id);
  }

  @Post('cars')
  createCar(@Request() req: any, @Body() body: any) {
    return this.travelService.createCar(req.user.userId, body);
  }

  @Put('cars/:id')
  updateCar(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.travelService.updateCar(req.user.userId, id, body);
  }

  @Delete('cars/:id')
  deleteCar(@Request() req: any, @Param('id') id: string) {
    return this.travelService.deleteCar(req.user.userId, id);
  }

  @Post('cars/:id/book')
  bookCar(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.travelService.bookCar(req.user.userId, { ...body, carId: id });
  }

  // Flights
  @Get('flights')
  listFlights(
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
  ) {
    return this.travelService.listFlights({ origin, destination });
  }

  @Get('flights/:id')
  getFlight(@Param('id') id: string) {
    return this.travelService.getFlight(id);
  }

  @Post('flights/:id/book')
  bookFlight(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.travelService.bookFlight(req.user.userId, {
      ...body,
      flightId: id,
    });
  }

  // Holiday Packages
  @Get('packages')
  listPackages(@Query('destination') destination?: string) {
    return this.travelService.listPackages({ destination });
  }

  @Get('packages/:id')
  getPackage(@Param('id') id: string) {
    return this.travelService.getPackage(id);
  }

  @Post('packages/:id/book')
  bookPackage(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.travelService.bookPackage(req.user.userId, {
      ...body,
      packageId: id,
    });
  }

  // My Trips
  @Get('trips/mine')
  myTrips(@Request() req: any) {
    return this.travelService.myTrips(req.user.userId);
  }
}
