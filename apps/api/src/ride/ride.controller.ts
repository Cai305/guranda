import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
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
    this.rideGateway.broadcastLobbyUpdate({
      userId: req.user.userId,
      isOnline: profile.isOnline,
      lat: profile.currentLat,
      lng: profile.currentLng,
      vehicleModel: profile.vehicleModel,
      rating: profile.rating,
    });
    return profile;
  }

  @Get('fare-estimate')
  async getFareEstimate(
    @Query('pickupLat') pickupLat: string,
    @Query('pickupLng') pickupLng: string,
    @Query('dropoffLat') dropoffLat: string,
    @Query('dropoffLng') dropoffLng: string,
  ) {
    return this.rideService.getFareEstimate(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(dropoffLat),
      parseFloat(dropoffLng),
    );
  }

  @Get('drivers/nearby')
  async getNearbyOnlineDrivers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.rideService.getNearbyOnlineDrivers(parseFloat(lat), parseFloat(lng));
  }

  @Post('rider/request')
  async requestRide(@Request() req: any, @Body() body: any) {
    const { ride, matchedDriverIds } = await this.rideService.requestRide(
      req.user.userId,
      body,
    );

    // Targeted — only the matched nearby drivers hear about this request.
    this.rideGateway.notifyDrivers(matchedDriverIds, 'rideRequested', ride);
    return ride;
  }

  @Post('driver/accept/:rideId')
  async acceptRide(@Request() req: any, @Param('rideId') rideId: string) {
    const ride = await this.rideService.acceptRide(req.user.userId, rideId);

    this.rideGateway.broadcastToUser(ride.riderId, 'rideAccepted', ride);
    this.rideGateway.broadcastToRide(rideId, 'rideAccepted', ride);
    // Every other driver who saw the request needs to know it's gone —
    // still a broadcast (no per-driver targeting list retained past the
    // original request), which is fine since it's a small "remove this from
    // your incoming list" signal, not the fare/PII-bearing ride payload.
    this.rideGateway.server.emit('rideUnavailable', { rideId });

    return ride;
  }

  @Post('driver/start/:rideId')
  async startRide(@Request() req: any, @Param('rideId') rideId: string) {
    const ride = await this.rideService.startRide(req.user.userId, rideId);
    this.rideGateway.broadcastToUser(ride.riderId, 'rideStarted', ride);
    this.rideGateway.broadcastToRide(rideId, 'rideStarted', ride);
    return ride;
  }

  @Post('driver/complete/:rideId')
  async completeRide(@Request() req: any, @Param('rideId') rideId: string) {
    const ride = await this.rideService.completeRide(req.user.userId, rideId);

    this.rideGateway.broadcastToUser(ride.riderId, 'rideCompleted', ride);
    this.rideGateway.broadcastToRide(rideId, 'rideCompleted', ride);

    return ride;
  }

  @Post('rider/cancel/:rideId')
  async cancelRideAsRider(@Request() req: any, @Param('rideId') rideId: string) {
    const ride = await this.rideService.cancelRide(req.user.userId, rideId, 'RIDER');
    if (ride.driverId) this.rideGateway.broadcastToUser(ride.driverId, 'rideCancelled', ride);
    this.rideGateway.broadcastToRide(rideId, 'rideCancelled', ride);
    this.rideGateway.server.emit('rideUnavailable', { rideId });
    return ride;
  }

  @Post('driver/cancel/:rideId')
  async cancelRideAsDriver(@Request() req: any, @Param('rideId') rideId: string) {
    const ride = await this.rideService.cancelRide(req.user.userId, rideId, 'DRIVER');
    this.rideGateway.broadcastToUser(ride.riderId, 'rideCancelled', ride);
    this.rideGateway.broadcastToRide(rideId, 'rideCancelled', ride);
    return ride;
  }

  @Post('rider/rate/:rideId')
  async rateDriver(
    @Request() req: any,
    @Param('rideId') rideId: string,
    @Body() body: { rating: number },
  ) {
    return this.rideService.rateDriver(req.user.userId, rideId, body.rating);
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
