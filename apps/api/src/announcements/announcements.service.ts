import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

// Contextual news — never a menu item, always rendered inline by
// ContextualNewsBanner wherever its contextKey is on screen (a mini-app
// screen, a campaign detail page). Read side is public/unauthenticated so
// the banner can render for anyone; write side is gated per context.
@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  list(contextType: string, contextKey: string) {
    return this.prisma.announcement.findMany({
      where: {
        contextType: contextType as any,
        contextKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // A business can only post updates for a CAMPAIGN context whose campaign
  // they themselves created — never MINI_APP context (that's admin-only,
  // see createByAdmin).
  async createByBusinessOwner(userId: string, dto: CreateAnnouncementDto) {
    if (dto.contextType !== 'CAMPAIGN') {
      throw new ForbiddenException('Only admins can post mini-app updates');
    }
    const campaign = await this.prisma.campaign.findUnique({ where: { id: dto.contextKey } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.createdByUserId !== userId) {
      throw new ForbiddenException('You can only post updates to your own campaign');
    }
    return this.prisma.announcement.create({
      data: {
        contextType: dto.contextType,
        contextKey: dto.contextKey,
        title: dto.title,
        body: dto.body,
        iconUrl: dto.iconUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdByBusinessId: campaign.createdByBusinessId,
      },
    });
  }

  async createByAdmin(adminId: string, dto: CreateAnnouncementDto) {
    if (dto.contextType === 'MINI_APP' && !dto.contextKey.trim()) {
      throw new BadRequestException('contextKey is required (a mini-app id)');
    }
    return this.prisma.announcement.create({
      data: {
        contextType: dto.contextType,
        contextKey: dto.contextKey,
        title: dto.title,
        body: dto.body,
        iconUrl: dto.iconUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdByAdminId: adminId,
      },
    });
  }
}
