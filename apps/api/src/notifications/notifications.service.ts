import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

/**
 * The generic inbox every "someone wants your attention" feature should
 * write into. Existing request-shaped features (friend requests, relationship
 * requests) keep their own push notification call — this ADDS a persistent,
 * in-app-readable entry alongside it, it doesn't replace push. See
 * relationships.service.ts's sendRequest() for the first real caller.
 */
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, data: data as Prisma.InputJsonValue | undefined },
    });
  }

  async listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // ── Push preferences (Settings > Notifications) ──────────────────────────
  // Real per-category control every sendCategorizedPush call site (see
  // common/push.ts) actually checks — not the AsyncStorage-only screen this
  // replaces. A missing row reads as "everything on", so returning the
  // schema defaults here for a user with no row keeps the mobile screen's
  // initial state honest without needing a row to exist yet.

  private static readonly DEFAULTS = {
    pushEnabled: true,
    messages: true,
    calls: true,
    social: true,
    achievements: true,
    reminders: true,
    approvals: true,
    games: true,
    soundEnabled: true,
  };

  async getPreferences(userId: string) {
    const row = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return row ?? { userId, ...NotificationsService.DEFAULTS };
  }

  async updatePreferences(userId: string, patch: Partial<typeof NotificationsService.DEFAULTS>) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...NotificationsService.DEFAULTS, ...patch },
      update: patch,
    });
  }
}
