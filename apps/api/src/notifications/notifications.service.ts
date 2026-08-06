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
}
