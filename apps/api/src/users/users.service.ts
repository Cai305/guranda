import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterUserDto } from '@mxit2/types';
import { Wallet as XrplWallet, Client as XrplClient } from 'xrpl';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { computeLiveActivity, getDisplayedReputation } from './reputation.util';
import { assertUsernameClaimable } from '../usernames/username-validation.util';
import { BadgeService } from '../profile/badge.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private badgeService: BadgeService,
  ) {}

  async registerUser(dto: RegisterUserDto) {
    // Every new account's registration username IS its free first Username
    // claim (apps/api/src/usernames/) — length>=3, charset, reserved-brand
    // and length<3 (1-2 char) checks all live in this one shared gate.
    const label = await assertUsernameClaimable(this.prisma, dto.username);

    if (
      !dto.firstName?.trim() ||
      !dto.lastName?.trim() ||
      !dto.occupation?.trim()
    ) {
      throw new BadRequestException(
        'First name, last name and occupation are required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.passwordHash, salt);

      // 1. Create the User
      const user = await tx.user.create({
        data: {
          username: label,
          phoneNumber: dto.phoneNumber,
          passwordHash: hashedPassword,
          isSelfCustodial: dto.isSelfCustodial,
        },
      });

      // 1b. The matching Username asset — the "1 free chance at registration"
      // — active from the start, reputation starts at 0/Nano like any fresh
      // claim (see reputation.util.ts + UsernameService.activate()).
      const usernameRow = await tx.username.create({
        data: {
          label,
          ownerId: user.id,
          isActive: true,
          acquiredVia: 'FREE_CLAIM',
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { activeUsernameId: usernameRow.id },
      });

      // 2. Create the Profile
      const profile = await tx.userProfile.create({
        data: {
          userId: user.id,
          displayName: label,
        },
      });

      // Mandatory personal info. Every account is auto-VERIFIED at signup
      // for now (product decision to remove the ID-upload gate temporarily)
      // instead of the normal UNVERIFIED-until-ID-submitted flow — revert to
      // leaving `status` unset (defaults to UNVERIFIED) to restore the gate.
      await tx.verification.create({
        data: {
          userId: user.id,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          occupation: dto.occupation.trim(),
          status: 'VERIFIED',
          reviewedAt: new Date(),
          reviewedBy: 'auto:signup-default',
        },
      });

      // Generate XRPL Wallet
      let xrplAddress: string | null = null;
      let encryptedSeed: string | null = null;

      if (!dto.isSelfCustodial) {
        // Platform Managed: We generate and store it
        const newWallet = XrplWallet.generate();
        xrplAddress = newWallet.classicAddress;

        // In production, encrypt this with KMS or strong AES before DB insertion
        encryptedSeed = Buffer.from(newWallet.seed!).toString('base64');

        // Asynchronously fund the wallet via testnet faucet
        // We don't await this so the registration request is fast
        this.fundXrplWallet(newWallet).catch(console.error);
      }

      // 3. Create the Masheleni Wallet with the Guranda welcome bonus
      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          xrplAddress: xrplAddress,
          encryptedSeed: encryptedSeed,
          balanceMasheleni: 100,
        },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: 100,
          type: 'RECEIVE',
          status: 'SUCCESS',
        },
      });

      return {
        user: {
          ...profile,
          userId: user.id,
        },
        token: this.authService.generateToken(user.id, user.username),
      };
    }).then(async (result) => {
      // Best-effort, outside the transaction — a Founder-badge hiccup
      // should never block registration itself.
      await this.badgeService.tryMintScarce(result.user.userId, 'FOUNDER').catch(() => {});
      return result;
    });
  }

  private async fundXrplWallet(wallet: XrplWallet) {
    const client = new XrplClient('wss://s.altnet.rippletest.net:51233');
    await client.connect();
    console.log(`Funding new XRPL wallet: ${wallet.classicAddress}...`);
    await client.fundWallet(wallet);
    console.log(`Successfully funded ${wallet.classicAddress}`);
    await client.disconnect();
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        profile: { select: { displayName: true, avatarUrl: true } },
      },
    });
  }

  async savePushToken(userId: string, token: string) {
    if (!token) throw new BadRequestException('Missing push token');
    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token },
    });
    return { success: true };
  }

  async saveLocation(userId: string, lat: number, lng: number, label?: string) {
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      throw new BadRequestException('Missing or invalid lat/lng');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        locationLat: lat,
        locationLng: lng,
        locationLabel: label ?? null,
        locationUpdatedAt: new Date(),
      },
    });
    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      // 400, not 401 — this is a validation failure on an already-valid
      // session (the JWT itself is fine), not a session-expired case. The
      // mobile client's fetchApi wrapper treats ANY 401 as "log the user
      // out" (see apps/mobile/src/utils/api.ts), which would otherwise
      // kick the user back to the login screen just for mistyping their
      // current password.
      throw new BadRequestException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { success: true };
  }

  /** Latest device-reported fix — this is a live "where are they right now" snapshot, not a location history log. */
  async getLocation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        locationLat: true,
        locationLng: true,
        locationLabel: true,
        locationUpdatedAt: true,
      },
    });
    if (!user?.locationUpdatedAt) return null;
    return {
      lat: user.locationLat,
      lng: user.locationLng,
      label: user.locationLabel,
      updatedAt: user.locationUpdatedAt,
    };
  }

  // After this many consecutive bad passwords, the account is locked for
  // LOCKOUT_DURATION_MS regardless of the per-IP throttle on the route —
  // a distributed attacker rotating IPs still can't grind one account.
  private static readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000;

  async loginUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked due to repeated failed login attempts. Try again later.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockingOut = attempts >= UsersService.MAX_FAILED_LOGIN_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: lockingOut
          ? {
              failedLoginAttempts: 0,
              lockedUntil: new Date(Date.now() + UsersService.LOCKOUT_DURATION_MS),
            }
          : { failedLoginAttempts: attempts },
      });
      throw new UnauthorizedException(
        lockingOut
          ? 'Account temporarily locked due to repeated failed login attempts. Try again later.'
          : 'Invalid username or password',
      );
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('This account has been suspended');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return {
      user: {
        userId: user.id,
        username: user.username,
        displayName: user.profile?.displayName,
        xrplAddress: user.wallet?.xrplAddress,
      },
      token: this.authService.generateToken(user.id, user.username),
    };
  }

  // Reputation, subscribers and influencer level are computed on read from
  // real activity — not stored — so they always reflect current state
  // (posts/likes, OOTD votes, video performance, games played, streams
  // hosted, gifts received). Ludo/WordBattle/Pool store their seat list as
  // a Json blob rather than a join table, so counting "games played" needs
  // a JSONB containment query (matches ActivityService's gamesSummary).
  /**
   * The account's real lifetime activity, keyed by userId forever — this
   * formula never changes and never gets re-keyed by username. What DOES
   * change is how getProfile() turns this into a *displayed* number (see
   * below): the displayed reputation/level/subscribers track whichever
   * Username is currently active, via a baseline+delta snapshot maintained
   * by UsernameService.activate() (apps/api/src/usernames/username.service.ts).
   */
  async computeLiveActivity(userId: string) {
    return computeLiveActivity(this.prisma, userId);
  }

  /**
   * Assumed durations for bookings that only capture a start instant, no
   * length — used purely to size the "currently active" window for the
   * auto-status resolver below. Not real appointment lengths; correct these
   * if/when the underlying models grow a real duration field.
   */
  private static readonly ASSUMED_DURATION_MS = {
    carWash: 45 * 60 * 1000,
    healthAppointment: 30 * 60 * 1000,
    tutorSession: 60 * 60 * 1000,
    concert: 3 * 60 * 60 * 1000,
    event: 3 * 60 * 60 * 1000,
  };

  /**
   * Derives "what a user is doing right now" from any mini-app booking whose
   * time window currently covers `now` — computed fresh on every call, never
   * persisted, so it can't go stale and needs no cron to revert once a
   * booking ends. Returns null if auto-status is off or nothing is active
   * (caller falls back to the manually-typed statusMessage).
   */
  async resolveActiveStatus(userId: string): Promise<string | null> {
    const map = await this.resolveActiveStatuses([userId]);
    return map.get(userId) ?? null;
  }

  /**
   * Batched sibling of resolveActiveStatus — one query per booking model
   * (not one per user) so list screens (chat list, friends list) don't
   * become N+1. Priority order below decides which wins if a user somehow
   * has two overlapping active bookings.
   */
  async resolveActiveStatuses(userIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (userIds.length === 0) return result;

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: userIds }, autoStatusEnabled: true },
      select: { userId: true },
    });
    const eligible = profiles.map((p) => p.userId);
    if (eligible.length === 0) return result;

    const now = new Date();
    const { ASSUMED_DURATION_MS } = UsersService;
    const remaining = new Set(eligible);
    const applyMatches = (rows: { userId: string }[], text: string) => {
      for (const row of rows) {
        if (remaining.has(row.userId)) {
          result.set(row.userId, text);
          remaining.delete(row.userId);
        }
      }
    };

    // 1. Flights — join through TravelFlight for departure/arrival times.
    if (remaining.size > 0) {
      const rows = await this.prisma.travelFlightBooking.findMany({
        where: {
          userId: { in: [...remaining] },
          status: 'CONFIRMED',
          flight: { departureTime: { lte: now }, arrivalTime: { gte: now } },
        },
        select: { userId: true },
      });
      applyMatches(rows, '✈️ Currently on a flight');
    }
    // 2. Stays.
    if (remaining.size > 0) {
      const rows = await this.prisma.travelStayBooking.findMany({
        where: {
          guestId: { in: [...remaining] },
          status: 'CONFIRMED',
          checkIn: { lte: now },
          checkOut: { gte: now },
        },
        select: { guestId: true },
      });
      applyMatches(rows.map((r) => ({ userId: r.guestId })), '🧳 Away on a trip');
    }
    // 3. Rental cars.
    if (remaining.size > 0) {
      const rows = await this.prisma.travelCarBooking.findMany({
        where: {
          guestId: { in: [...remaining] },
          status: 'CONFIRMED',
          pickupDate: { lte: now },
          returnDate: { gte: now },
        },
        select: { guestId: true },
      });
      applyMatches(rows.map((r) => ({ userId: r.guestId })), '🚙 Out with a rental car');
    }
    // 4. Movies — join through showtime → movie for duration.
    if (remaining.size > 0) {
      const rows = await this.prisma.movieBooking.findMany({
        where: {
          userId: { in: [...remaining] },
          status: 'CONFIRMED',
          showtime: { startsAt: { lte: now } },
        },
        select: { userId: true, showtime: { select: { startsAt: true, movie: { select: { durationMins: true } } } } },
      });
      applyMatches(
        rows
          .filter((r) => {
            const end = new Date(r.showtime.startsAt.getTime() + r.showtime.movie.durationMins * 60 * 1000);
            return end >= now;
          })
          .map((r) => ({ userId: r.userId })),
        '🎬 At the movies',
      );
    }
    // 5. Hair appointments — join through service for duration.
    if (remaining.size > 0) {
      const rows = await this.prisma.hairBooking.findMany({
        where: {
          customerId: { in: [...remaining] },
          status: { in: ['PENDING', 'CONFIRMED'] },
          appointmentAt: { lte: now },
        },
        select: { customerId: true, appointmentAt: true, service: { select: { duration: true } } },
      });
      applyMatches(
        rows
          .filter((r) => new Date(r.appointmentAt.getTime() + r.service.duration * 60 * 1000) >= now)
          .map((r) => ({ userId: r.customerId })),
        '💇 At a hair appointment',
      );
    }
    // 6. Car wash — no duration field, use assumed default.
    if (remaining.size > 0) {
      const rows = await this.prisma.carWashBooking.findMany({
        where: {
          userId: { in: [...remaining] },
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledFor: {
            lte: now,
            gte: new Date(now.getTime() - ASSUMED_DURATION_MS.carWash),
          },
        },
        select: { userId: true },
      });
      applyMatches(rows, '🚗 At the car wash');
    }
    // 7. Health appointments — no duration field, use assumed default.
    if (remaining.size > 0) {
      const rows = await this.prisma.healthAppointment.findMany({
        where: {
          patientId: { in: [...remaining] },
          status: 'CONFIRMED',
          scheduledAt: {
            lte: now,
            gte: new Date(now.getTime() - ASSUMED_DURATION_MS.healthAppointment),
          },
        },
        select: { patientId: true },
      });
      applyMatches(rows.map((r) => ({ userId: r.patientId })), '🏥 At a health appointment');
    }
    // 8. Tutor sessions — no duration field, use assumed default.
    if (remaining.size > 0) {
      const rows = await this.prisma.learningTutorSession.findMany({
        where: {
          studentId: { in: [...remaining] },
          status: 'CONFIRMED',
          scheduledAt: {
            lte: now,
            gte: new Date(now.getTime() - ASSUMED_DURATION_MS.tutorSession),
          },
        },
        select: { studentId: true },
      });
      applyMatches(rows.map((r) => ({ userId: r.studentId })), '📚 In a tutoring session');
    }
    // 9. Concerts — no duration field, use assumed default.
    if (remaining.size > 0) {
      const rows = await this.prisma.concertBooking.findMany({
        where: {
          userId: { in: [...remaining] },
          status: 'CONFIRMED',
          concert: {
            startsAt: {
              lte: now,
              gte: new Date(now.getTime() - ASSUMED_DURATION_MS.concert),
            },
          },
        },
        select: { userId: true },
      });
      applyMatches(rows, '🎵 At a concert');
    }
    // 10. Events — no duration field, use assumed default.
    if (remaining.size > 0) {
      const rows = await this.prisma.eventBooking.findMany({
        where: {
          userId: { in: [...remaining] },
          status: 'CONFIRMED',
          event: {
            startsAt: {
              lte: now,
              gte: new Date(now.getTime() - ASSUMED_DURATION_MS.event),
            },
          },
        },
        select: { userId: true },
      });
      applyMatches(rows, '🎉 At an event');
    }

    return result;
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) return profile;

    const [{ live, subscribers, reputation, level }, autoStatus] = await Promise.all([
      getDisplayedReputation(this.prisma, userId),
      this.resolveActiveStatus(userId),
    ]);

    return {
      ...profile,
      // What to actually display as "status" — the auto-derived activity
      // when one is active, else whatever the user typed manually.
      effectiveStatus: autoStatus ?? profile.statusMessage ?? null,
      postsCount: live.postsCount,
      likesReceived: live.likesReceived,
      gamesCount: live.gamesCount,
      liveStreamsHosted: live.liveStreamsHosted,
      giftsReceived: live.giftsReceived,
      subscribers,
      reputation,
      level,
    };
  }

  /** Public-facing profile for viewing another user — chat header, friends list, etc. */
  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        profile: { select: { displayName: true, avatarUrl: true, bio: true, statusMessage: true } },
      },
    });
    if (!user) return null;

    const autoStatus = await this.resolveActiveStatus(userId);
    return {
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      effectiveStatus: autoStatus ?? user.profile?.statusMessage ?? null,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      avatarUrl?: string;
      displayName?: string;
      bio?: string;
      statusMessage?: string;
      autoStatusEnabled?: boolean;
    },
  ) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        avatarUrl: data.avatarUrl ?? undefined,
        displayName: data.displayName ?? undefined,
        bio: data.bio ?? undefined,
        statusMessage: data.statusMessage ?? undefined,
        autoStatusEnabled: data.autoStatusEnabled ?? undefined,
      },
      create: {
        userId,
        avatarUrl: data.avatarUrl,
        displayName: data.displayName,
        bio: data.bio,
        statusMessage: data.statusMessage,
        autoStatusEnabled: data.autoStatusEnabled,
      },
    });
  }

  async searchUsers(query: string, currentUserId: string) {
    if (!query) return [];

    return this.prisma.user
      .findMany({
        where: {
          AND: [
            {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                {
                  profile: {
                    displayName: { contains: query, mode: 'insensitive' },
                  },
                },
                { phoneNumber: { contains: query } },
              ],
            },
            {
              id: { not: currentUserId }, // Exclude self
            },
          ],
        },
        include: {
          profile: true,
        },
        take: 20,
      })
      .then((users) =>
        users.map((u) => ({
          userId: u.id,
          username: u.username,
          displayName: u.profile?.displayName,
          avatarUrl: u.profile?.avatarUrl,
        })),
      );
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    try {
      await this.prisma.follow.create({
        data: { followerId, followingId },
      });
      return { status: 'followed' };
    } catch {
      await this.prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      return { status: 'unfollowed' };
    }
  }

  async getFollowStats(userId: string, viewerId?: string) {
    const [followerCount, followingCount, isFollowedByMe] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      viewerId
        ? this.prisma.follow
            .findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: userId } },
            })
            .then((f) => !!f)
        : false,
    ]);
    return { followerCount, followingCount, isFollowedByMe };
  }
}
