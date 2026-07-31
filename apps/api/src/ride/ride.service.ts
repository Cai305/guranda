import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);

  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
  ) {}

  async createDriverProfile(userId: string, data: any) {
    return this.prisma.driverProfile.upsert({
      where: { userId },
      update: data,
      create: { ...data, userId },
    });
  }

  async getDriverProfile(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    // Return a default offline profile if none exists yet
    return profile ?? { userId, isOnline: false, rating: 5.0, totalRides: 0 };
  }

  async setDriverOnlineStatus(userId: string, isOnline: boolean) {
    // Upsert so drivers don't need to pre-create a profile
    return this.prisma.driverProfile.upsert({
      where: { userId },
      update: { isOnline },
      create: { userId, isOnline },
    });
  }

  async requestRide(riderId: string, data: any) {
    return this.prisma.ride.create({
      data: {
        riderId,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        pickupAddress: data.pickupAddress,
        dropoffLat: data.dropoffLat,
        dropoffLng: data.dropoffLng,
        dropoffAddress: data.dropoffAddress,
        status: 'REQUESTED',
        fare: data.fare || 10.0,
      },
      include: { rider: true },
    });
  }

  async acceptRide(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== 'REQUESTED')
      throw new BadRequestException('Ride is no longer available');

    return this.prisma.ride.update({
      where: { id: rideId },
      data: {
        driverId,
        status: 'ACCEPTED',
      },
      include: { rider: true, driver: true },
    });
  }

  async completeRide(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.driverId !== driverId)
      throw new BadRequestException('Unauthorized');

    // Attempt XRPL transaction from Rider to Driver
    try {
      const driverWallet = await this.prisma.wallet.findUnique({
        where: { userId: driverId },
      });
      if (driverWallet && driverWallet.xrplAddress && ride.fare) {
        await this.walletsService.sendMasheleni(
          ride.riderId,
          driverWallet.xrplAddress,
          ride.fare.toString(),
        );
        this.logger.log(
          `Payment of ${ride.fare} Masheleni successful from rider ${ride.riderId} to driver ${driverId}`,
        );
      } else {
        this.logger.warn(
          `Could not process payment for ride ${rideId}: Driver wallet not configured properly or fare missing.`,
        );
      }
    } catch (e) {
      this.logger.error(
        `Payment failed for ride ${rideId}: ${e.message}`,
        e.stack,
      );
      // We don't throw here to ensure the ride can still be completed in the DB even if testnet is down
    }

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'COMPLETED' },
    });
  }

  async getActiveRidesForDriver(driverId: string) {
    return this.prisma.ride.findFirst({
      where: { driverId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      include: { rider: true, driver: true },
    });
  }

  async getActiveRideForRider(riderId: string) {
    return this.prisma.ride.findFirst({
      where: {
        riderId,
        status: { in: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'] },
      },
      include: { rider: true, driver: true },
    });
  }
}
