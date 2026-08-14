import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { haversineKm } from '../common/geo';

// Straight-line (haversine) fare model — no routing/directions API is
// integrated anywhere in this codebase, so distance/ETA are estimates, not
// real road distance. Stated honestly in the mobile UI, not implied as
// turn-by-turn accurate.
const RIDE_BASE_FARE = 15;
const RIDE_PER_KM = 8;
const AVG_SPEED_KMH = 30;
const RIDE_HOLD_TTL_MINUTES = 120; // a ride can easily outlast holdFunds's default 15min
const NEARBY_DRIVER_RADIUS_KM = 15;
const NEARBY_DRIVER_LIMIT = 20;

@Injectable()
export class RideService {
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

  private computeFare(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ) {
    const distanceKm =
      Math.round(haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng) * 100) / 100;
    const fare = Math.round((RIDE_BASE_FARE + distanceKm * RIDE_PER_KM) * 100) / 100;
    const etaMinutes = Math.max(1, Math.ceil((distanceKm / AVG_SPEED_KMH) * 60));
    return { distanceKm, fare, etaMinutes };
  }

  getFareEstimate(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ) {
    return this.computeFare(pickupLat, pickupLng, dropoffLat, dropoffLng);
  }

  async requestRide(riderId: string, data: any) {
    const existing = await this.getActiveRideForRider(riderId);
    if (existing) {
      throw new BadRequestException('You already have an active ride');
    }

    // Fare is always computed server-side from the coordinates — a client-
    // supplied fare is never trusted (same rule this session's wallet/gift
    // work already established).
    const { distanceKm, fare } = this.computeFare(
      data.pickupLat,
      data.pickupLng,
      data.dropoffLat,
      data.dropoffLng,
    );

    const wallet = await this.prisma.wallet.findUnique({ where: { userId: riderId } });
    if (!wallet || Number(wallet.balanceMasheleni) < fare) {
      throw new BadRequestException(
        `Not enough MSH for this ride — fare is ${fare}, balance is ${wallet ? wallet.balanceMasheleni : 0}`,
      );
    }

    const ride = await this.prisma.ride.create({
      data: {
        riderId,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        pickupAddress: data.pickupAddress,
        dropoffLat: data.dropoffLat,
        dropoffLng: data.dropoffLng,
        dropoffAddress: data.dropoffAddress,
        status: 'REQUESTED',
        fare,
        distanceKm,
      },
      include: { rider: true },
    });

    const nearbyDrivers = await this.getNearbyOnlineDrivers(data.pickupLat, data.pickupLng);
    return { ride, matchedDriverIds: nearbyDrivers.map((d) => d.userId) };
  }

  async acceptRide(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== 'REQUESTED')
      throw new BadRequestException('Ride is no longer available');
    if (!ride.fare) throw new BadRequestException('Ride has no fare set');

    const riderWallet = await this.prisma.wallet.findUnique({
      where: { userId: ride.riderId },
    });
    if (!riderWallet) throw new BadRequestException("Rider's wallet not found");

    // Reserves the fare so it can't be spent elsewhere before completion —
    // if this throws (insufficient balance, changed since request), the
    // ride simply stays REQUESTED for another driver to try.
    const hold = await this.walletsService.holdFunds(
      riderWallet.id,
      ride.fare,
      `ride:${rideId}`,
      RIDE_HOLD_TTL_MINUTES,
    );

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { driverId, status: 'ACCEPTED', fareHoldId: hold.id },
      include: { rider: true, driver: true },
    });
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
    });
    return { ...updated, driverProfile };
  }

  async startRide(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.driverId !== driverId) throw new BadRequestException('Unauthorized');
    if (ride.status !== 'ACCEPTED')
      throw new BadRequestException(`Ride is ${ride.status}, not ACCEPTED`);

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'IN_PROGRESS' },
      include: { rider: true, driver: true },
    });
  }

  async completeRide(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.driverId !== driverId) throw new BadRequestException('Unauthorized');
    if (ride.status !== 'IN_PROGRESS')
      throw new BadRequestException(`Ride is ${ride.status}, not IN_PROGRESS`);
    if (!ride.fareHoldId || !ride.fare)
      throw new BadRequestException('Ride has no payment hold to settle');

    const riderWallet = await this.prisma.wallet.findUnique({
      where: { userId: ride.riderId },
    });
    const driverWallet = await this.prisma.wallet.findUnique({ where: { userId: driverId } });
    if (!riderWallet || !driverWallet) throw new BadRequestException('Wallet not found');

    // Same hold-then-settle shape as GiftsService.sendGiftViaHold — captureHold
    // alone only debits the holder's wallet, it can't credit a second party,
    // so this settles both sides + marks the hold CAPTURED in one atomic
    // transaction instead. Funds were already reserved at accept time, so
    // this failing would be a real bug, not an expected "insufficient funds"
    // case — unlike the old instant-transfer-on-complete flow, there's no
    // silent swallow here.
    const [, , , , , , updatedRide] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: riderWallet.id },
        data: { balanceMasheleni: { decrement: ride.fare } },
      }),
      this.prisma.wallet.update({
        where: { id: driverWallet.id },
        data: { balanceMasheleni: { increment: ride.fare } },
      }),
      this.prisma.transaction.create({
        data: { walletId: riderWallet.id, amount: -ride.fare, type: 'PAYMENT', status: 'SUCCESS' },
      }),
      this.prisma.transaction.create({
        data: { walletId: driverWallet.id, amount: ride.fare, type: 'RECEIVE', status: 'SUCCESS' },
      }),
      this.prisma.walletHold.update({
        where: { id: ride.fareHoldId },
        data: { status: 'CAPTURED', resolvedAt: new Date() },
      }),
      this.prisma.driverProfile.upsert({
        where: { userId: driverId },
        update: { totalRides: { increment: 1 } },
        create: { userId: driverId, totalRides: 1 },
      }),
      this.prisma.ride.update({
        where: { id: rideId },
        data: { status: 'COMPLETED' },
        include: { rider: true, driver: true },
      }),
    ]);

    return updatedRide;
  }

  async cancelRide(userId: string, rideId: string, cancelledBy: 'RIDER' | 'DRIVER') {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (cancelledBy === 'RIDER' && ride.riderId !== userId)
      throw new BadRequestException('Unauthorized');
    if (cancelledBy === 'DRIVER' && ride.driverId !== userId)
      throw new BadRequestException('Unauthorized');
    if (!['REQUESTED', 'ACCEPTED'].includes(ride.status))
      throw new BadRequestException(`Ride is ${ride.status} — can no longer be cancelled`);

    if (ride.fareHoldId) {
      await this.walletsService.releaseHold(ride.fareHoldId);
    }

    return this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'CANCELLED', cancelledBy },
      include: { rider: true, driver: true },
    });
  }

  async rateDriver(riderId: string, rideId: string, rating: number) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new BadRequestException('Rating must be an integer from 1 to 5');

    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== riderId) throw new BadRequestException('Unauthorized');
    if (ride.status !== 'COMPLETED') throw new BadRequestException('Ride is not completed yet');
    if (ride.riderRating != null)
      throw new BadRequestException('This ride has already been rated');
    if (!ride.driverId) throw new BadRequestException('Ride has no driver to rate');

    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: ride.driverId },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');

    // totalRides was already incremented for this ride in completeRide, so
    // it's the Nth rating point; oldRating is the average of the previous
    // N-1 (a simplification — not every completed ride is necessarily rated,
    // but there's no separate ratedRidesCount field, and this is close
    // enough for a first real rating signal instead of the dead 5.0 default).
    const n = profile.totalRides;
    const newRating = n > 1 ? (profile.rating * (n - 1) + rating) / n : rating;

    const [, updatedRide] = await this.prisma.$transaction([
      this.prisma.driverProfile.update({
        where: { userId: ride.driverId },
        data: { rating: Math.round(newRating * 100) / 100 },
      }),
      this.prisma.ride.update({
        where: { id: rideId },
        data: { riderRating: rating },
        include: { rider: true, driver: true },
      }),
    ]);

    return updatedRide;
  }

  /** Persists a driver's live position — called continuously while online, independent of any active ride. */
  async updateDriverLocation(userId: string, lat: number, lng: number) {
    return this.prisma.driverProfile.upsert({
      where: { userId },
      update: { currentLat: lat, currentLng: lng },
      create: { userId, currentLat: lat, currentLng: lng },
    });
  }

  async getNearbyOnlineDrivers(lat: number, lng: number, radiusKm = NEARBY_DRIVER_RADIUS_KM) {
    const drivers = await this.prisma.driverProfile.findMany({
      where: { isOnline: true, currentLat: { not: null }, currentLng: { not: null } },
    });
    return drivers
      .map((d) => ({
        ...d,
        distanceKm: haversineKm(lat, lng, d.currentLat as number, d.currentLng as number),
      }))
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, NEARBY_DRIVER_LIMIT)
      .map((d) => ({
        userId: d.userId,
        lat: d.currentLat as number,
        lng: d.currentLng as number,
        vehicleModel: d.vehicleModel,
        rating: d.rating,
      }));
  }

  async getActiveRidesForDriver(driverId: string) {
    return this.prisma.ride.findFirst({
      where: { driverId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      include: { rider: true, driver: true },
    });
  }

  async getActiveRideForRider(riderId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        riderId,
        status: { in: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'] },
      },
      include: { rider: true, driver: true },
    });
    // Same shape as acceptRide's response — so a page reload mid-ride still
    // has real vehicle/rating info to show, not just a bare User relation.
    if (!ride?.driverId) return ride;
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: ride.driverId },
    });
    return { ...ride, driverProfile };
  }
}
