import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface AdminActor {
  adminId: string | null;
  actorLabel: string;
}

// Written by every state-changing admin action (see AdminAccessGuard for how
// `req.admin` — the actor passed to log() — gets populated).
@Injectable()
export class AdminAuditService {
  constructor(private prisma: PrismaService) {}

  log(
    actor: AdminActor,
    action: string,
    target?: { type: string; id: string },
    details?: Record<string, unknown>,
  ) {
    return this.prisma.adminActionLog.create({
      data: {
        adminId: actor.adminId,
        actorLabel: actor.actorLabel,
        action,
        targetType: target?.type,
        targetId: target?.id,
        details: details as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
