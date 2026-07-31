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
import { levelForSubscribers } from './reputation.util';
import { assertUsernameClaimable } from '../usernames/username-validation.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
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

      // Mandatory personal info — required for every account, but on its
      // own only gets the user to UNVERIFIED (ID is still needed later).
      await tx.verification.create({
        data: {
          userId: user.id,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          occupation: dto.occupation.trim(),
        },
      });

      // Generate XRPL Wallet
      let xrplAddress = null;
      let encryptedSeed = null;

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

  async loginUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('This account has been suspended');
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
    const seatMatch = JSON.stringify([{ userId }]);

    const [
      postsCount,
      likesReceived,
      storyLikesReceived,
      videoLikes,
      videoViewsAgg,
      chessGames,
      ludoRows,
      wordBattleRows,
      poolRows,
      liveStreamsHosted,
      giftsReceived,
    ] = await Promise.all([
      this.prisma.post.count({ where: { authorId: userId } }),
      this.prisma.postLike.count({ where: { post: { authorId: userId } } }),
      this.prisma.storyLike.count({ where: { story: { userId } } }),
      this.prisma.videoLike.count({ where: { video: { creatorId: userId } } }),
      this.prisma.video.aggregate({
        where: { creatorId: userId },
        _sum: { views: true },
      }),
      this.prisma.chessGame.count({
        where: {
          OR: [{ whiteId: userId }, { blackId: userId }],
          status: { not: 'active' },
        },
      }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::int AS count FROM "LudoGame"
        WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::int AS count FROM "WordBattleGame"
        WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::int AS count FROM "PoolGame"
        WHERE seats @> ${seatMatch}::jsonb AND status = 'finished'
      `,
      this.prisma.liveRoom.count({ where: { hostId: userId } }),
      this.prisma.gift.count({ where: { recipientId: userId } }),
    ]);

    const videoViews = videoViewsAgg._sum.views ?? 0;
    const gamesCount =
      chessGames +
      Number(ludoRows[0]?.count ?? 0) +
      Number(wordBattleRows[0]?.count ?? 0) +
      Number(poolRows[0]?.count ?? 0);

    const subscribers = Math.round(
      storyLikesReceived * 4 +
        videoLikes * 5 +
        videoViews * 0.2 +
        gamesCount * 3 +
        giftsReceived * 6 +
        12,
    );
    const reputation = Math.round(
      subscribers * 3 +
        likesReceived * 2 +
        videoViews * 0.1 +
        gamesCount * 8 +
        liveStreamsHosted * 15,
    );

    return {
      postsCount,
      likesReceived,
      gamesCount,
      liveStreamsHosted,
      giftsReceived,
      subscribers,
      reputation,
    };
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) return profile;

    const live = await this.computeLiveActivity(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeUsernameId: true },
    });
    const active = user?.activeUsernameId
      ? await this.prisma.username.findUnique({
          where: { id: user.activeUsernameId },
        })
      : null;

    // Displayed reputation/subscribers = the active username's frozen
    // baseline + however much live activity has accrued since it was
    // activated. Switching usernames (UsernameService.activate()) re-freezes
    // this baseline, which is exactly what makes a purchased/established
    // handle's reputation "transfer" with it. `active == null` only for
    // not-yet-backfilled rows — falls back to the raw live value.
    const subscribers = active
      ? active.subscribersScore +
        (live.subscribers - active.activationLiveSubscribersBaseline)
      : live.subscribers;
    const reputation = active
      ? active.reputationScore +
        (live.reputation - active.activationLiveReputationBaseline)
      : live.reputation;
    const level = levelForSubscribers(subscribers);

    return {
      ...profile,
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

  async updateProfile(
    userId: string,
    data: {
      avatarUrl?: string;
      displayName?: string;
      bio?: string;
      statusMessage?: string;
    },
  ) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        avatarUrl: data.avatarUrl ?? undefined,
        displayName: data.displayName ?? undefined,
        bio: data.bio ?? undefined,
        statusMessage: data.statusMessage ?? undefined,
      },
      create: {
        userId,
        avatarUrl: data.avatarUrl,
        displayName: data.displayName,
        bio: data.bio,
        statusMessage: data.statusMessage,
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
}
