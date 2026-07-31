import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Extracted from the old ai.service.ts's inline prisma.aiReminder calls so
// the calendar.* AI tools (and anything else) call a real service instead of
// reaching into Prisma directly from a tool handler.
@Injectable()
export class AiReminderService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.aiReminder.findMany({
      where: { userId, done: false, fireAt: { gte: new Date() } },
      orderBy: { fireAt: 'asc' },
      take: 10,
    });
  }

  async create(
    userId: string,
    dto: { title: string; fireAtIso: string; prepNote?: string },
  ) {
    const fireAt = new Date(dto.fireAtIso);
    if (isNaN(fireAt.getTime()))
      throw new BadRequestException('Invalid date/time');
    return this.prisma.aiReminder.create({
      data: {
        userId,
        title: dto.title,
        fireAt,
        prepNote: dto.prepNote || null,
      },
    });
  }
}
