import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { RideService } from './ride.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RideGateway } from './ride.gateway';

@Controller('ride')
@UseGuards(JwtAuthGuard)
export class RideController {
  constructor(
    private readonly rideService: RideService,
    private readonly rideGateway: RideGateway,
  ) {}

  @Post('driver/profile')
  async createDriverProfile(@Request() req: any, @Body() body: any) {
    return this.rideService.createDriverProfile(req.user.userId, body);
  }

  @Get('driver/profile')
  async getDriverProfile(@Request() req: any) {
    return this.rideService.getDriverProfile(req.user.userId);
  }

  @Post('driver/status')
  async setDriverOnlineStatus(
    @Request() req: any,
    @Body() body: { isOnline: boolean },
  ) {
    const profile = await this.rideService.setDriverOnlineStatus(
      req.user.userId,
      body.isOnline,
    );
    // Broadcast status to riders?
    return profile;
  }

  @Post('rider/request')
  async requestRide(@Request() req: any, @Body() body: any) {
    const ride = await this.rideService.requestRide(req.user.userId, body);

    // Broadcast to online drivers
    this.rideGateway.server.emit('rideRequested', ride);
    return ride;
  }

  @Post('driver/accept/:rideId')
  async acceptRide(@Request() req: any, @Param('rideId') rideId: string) {
    const ride = await this.rideService.acceptRide(req.user.userId, rideId);

    // Notify the specific rider via their userId room
    this.rideGateway.server.to(ride.riderId).emit('rideAccepted', ride);

    // Also emit to the ride-specific room for anyone already listening
    this.rideGateway.server.to(`ride_${rideId}`).emit('rideAccepted', ride);

    // Broadcast to all drivers that this ride is no longer available
    this.rideGateway.server.emit('rideUnavailable', { rideId });

    return ride;
  }

  @Post('driver/complete/:rideId')
  async completeRide(@Request() req: any, @Param('rideId') rideId: string) {
    const ride = await this.rideService.completeRide(req.user.userId, rideId);

    // Notify rider via their userId room
    this.rideGateway.server.to(ride.riderId).emit('rideCompleted', ride);

    // Also emit to the ride-specific room
    this.rideGateway.server.to(`ride_${rideId}`).emit('rideCompleted', ride);

    return ride;
  }

  @Get('driver/active-ride')
  async getActiveRidesForDriver(@Request() req: any) {
    return this.rideService.getActiveRidesForDriver(req.user.userId);
  }

  @Get('rider/active-ride')
  async getActiveRideForRider(@Request() req: any) {
    return this.rideService.getActiveRideForRider(req.user.userId);
  }
}
