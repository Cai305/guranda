import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LiveReportsService {
  constructor(private prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    roomId: string,
    reportedUserId: string,
    reason: string,
    details?: string,
  ) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Stream not found');

    return this.prisma.liveStreamReport.create({
      data: {
        roomId,
        reporterId,
        reportedUserId,
        reason,
        details: details ?? null,
      },
    });
  }

  async listReports(status?: string) {
    return this.prisma.liveStreamReport.findMany({
      where: status ? { status } : undefined,
      include: {
        room: { include: { host: { include: { profile: true } } } },
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
        reviewedBy: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async resolveReport(reportId: string, status: 'reviewed' | 'actioned' | 'dismissed', reviewedById: string) {
    return this.prisma.liveStreamReport.update({
      where: { id: reportId },
      data: { status, reviewedById },
    });
  }

  async getReport(reportId: string) {
    return this.prisma.liveStreamReport.findUnique({
      where: { id: reportId },
      include: {
        room: { include: { host: { include: { profile: true } } } },
        reporter: { include: { profile: true } },
        reportedUser: { include: { profile: true } },
        reviewedBy: { include: { profile: true } },
      },
    });
  }
}
