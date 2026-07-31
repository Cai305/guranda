import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

// Accepts EITHER of two credentials, in order:
//
// 1. The legacy shared server-to-server key (x-admin-key vs ADMIN_API_KEY) —
//    what the website's ops dashboard has always used (see
//    admin-api-key.guard.ts, which this supersedes). Kept working as-is:
//    the website has no per-admin login flow yet, and breaking it would
//    take down the only real consumer of this whole surface.
// 2. A normal Bearer JWT for a User whose role is ADMIN — the real,
//    individually-accountable path this guard adds. Any User can be
//    promoted to ADMIN directly in the DB (`role` column, see
//    prisma/schema.prisma); once promoted, they authenticate the same way
//    as any other endpoint (POST /users/login), then call admin endpoints
//    with that token.
//
// Either path populates `req.admin = { adminId, actorLabel }` so
// AdminService can write an AdminActionLog entry that records who did what —
// a real admin JWT gives a real adminId; the shared key gives
// actorLabel: 'shared-key' and adminId: null, since a shared secret carries
// no individual identity to log.
@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const key = req.headers['x-admin-key'];
    if (key) {
      const expected = process.env.ADMIN_API_KEY;
      if (!expected) {
        throw new UnauthorizedException(
          'ADMIN_API_KEY is not configured on the server',
        );
      }
      if (key !== expected) {
        throw new UnauthorizedException('Invalid admin key');
      }
      req.admin = { adminId: null, actorLabel: 'shared-key' };
      return true;
    }

    const authHeader: string | undefined = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwt.verify(authHeader.slice(7));
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, username: true, role: true, isSuspended: true },
        });
        if (user && !user.isSuspended && user.role === 'ADMIN') {
          req.admin = { adminId: user.id, actorLabel: user.username };
          return true;
        }
      } catch {
        // fall through to the rejection below
      }
    }

    throw new UnauthorizedException(
      'Admin access requires a valid x-admin-key header or an admin-account Bearer token',
    );
  }
}
