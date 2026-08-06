import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Grants for THIRD-PARTY capabilities (mini apps / external developer
 * tools) — distinct from AiAgent.permissions, which already gates what a
 * user's OWN AI companion may call (see action-executor.service.ts:44-50)
 * and needed no new model. This is the seed for §11/§13 of the platform
 * evolution plan: a sandboxed mini app declares a capabilityKey + scope in
 * its manifest, the user grants or revokes it, and a guard built on
 * `check()` gates the call — nothing wires into this yet since no
 * third-party capability exists in the product today.
 */
@Injectable()
export class CapabilityGrantService {
  constructor(private prisma: PrismaService) {}

  async grant(userId: string, capabilityKey: string, scope: string) {
    return this.prisma.capabilityGrant.upsert({
      where: { userId_capabilityKey: { userId, capabilityKey } },
      create: { userId, capabilityKey, scope },
      update: { scope, revokedAt: null },
    });
  }

  async revoke(userId: string, capabilityKey: string) {
    return this.prisma.capabilityGrant.updateMany({
      where: { userId, capabilityKey, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async check(userId: string, capabilityKey: string): Promise<boolean> {
    const grant = await this.prisma.capabilityGrant.findUnique({
      where: { userId_capabilityKey: { userId, capabilityKey } },
    });
    return !!grant && !grant.revokedAt;
  }

  async assertGranted(userId: string, capabilityKey: string) {
    if (!(await this.check(userId, capabilityKey))) {
      throw new ForbiddenException(
        `Capability "${capabilityKey}" has not been granted by this user`,
      );
    }
  }

  async listForUser(userId: string) {
    return this.prisma.capabilityGrant.findMany({
      where: { userId, revokedAt: null },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
