import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JWT_SECRET } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  // A valid JWT signature alone doesn't mean the user still exists (dev DB
  // resets, account deletion) — without this check every guarded read would
  // silently no-op for a dead session and only the first write would surface
  // it, as an opaque 500 from a foreign-key violation. Also checks
  // isSuspended so a suspension takes effect immediately — tokens are valid
  // for 7 days, and without this a suspended user could keep using every
  // already-issued session until it naturally expired.
  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isSuspended: true },
    });
    if (!user) throw new UnauthorizedException('Session expired');
    if (user.isSuspended) throw new UnauthorizedException('This account has been suspended');
    return { userId: payload.sub, username: payload.username };
  }
}
