import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { WidgetRegistryService } from '../widget-registry/widget-registry.service';
import { FeatureStatus, MarketplaceVisibility } from '@prisma/client';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { CreateFeatureVersionDto } from './dto/create-feature-version.dto';

// Phase 1: real create/list/get for the Feature entity — a named,
// composable bundle of EXISTING tool-registry actions + widget-registry
// widgets (see schema.prisma's Feature/FeatureVersion doc comment).
// Deliberately does not implement: install/uninstall with payment (Phase
// 4 Marketplace), or AI-assisted generation of a Feature's action list
// (Phase 3 Feature Builder). Every action/widget reference is validated
// against the real registries at version-creation time so a Feature can
// never point at something that doesn't exist.
@Injectable()
export class FeaturesService {
  constructor(
    private prisma: PrismaService,
    private toolRegistry: ToolRegistryService,
    private widgetRegistry: WidgetRegistryService,
  ) {}

  async create(userId: string, dto: CreateFeatureDto) {
    return this.prisma.feature.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        icon: dto.icon,
        gradientColors: dto.gradientColors ?? [],
        pricingType: dto.pricingType ?? undefined,
        price: dto.price ?? undefined,
        visibility: dto.visibility ?? undefined,
        createdByUserId: userId,
      },
    });
  }

  /** Public marketplace-style feed — published AND listed. Mirrors CampaignsService.getFeed's public/private split. */
  async listPublished() {
    return this.prisma.feature.findMany({
      where: {
        status: FeatureStatus.PUBLISHED,
        visibility: { in: [MarketplaceVisibility.PUBLIC, MarketplaceVisibility.MARKETPLACE] },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listMine(userId: string) {
    return this.prisma.feature.findMany({
      where: { createdByUserId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(id: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: { orderBy: { createdAt: 'desc' } },
        createdByUser: { select: { id: true, username: true } },
      },
    });
    if (!feature) throw new NotFoundException(`Feature "${id}" not found`);
    return feature;
  }

  async updateStatus(userId: string, id: string, status: FeatureStatus) {
    const feature = await this.assertOwner(userId, id);
    return this.prisma.feature.update({
      where: { id: feature.id },
      data: { status },
    });
  }

  async listVersions(id: string) {
    await this.getFeatureOr404(id);
    return this.prisma.featureVersion.findMany({
      where: { featureId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVersion(userId: string, featureId: string, dto: CreateFeatureVersionDto) {
    const feature = await this.assertOwner(userId, featureId);

    const invalidActions = dto.actionNames.filter((name) => !this.toolRegistry.hasTool(name));
    if (invalidActions.length > 0) {
      throw new BadRequestException(
        `Unknown tool-registry action name(s): ${invalidActions.join(', ')}`,
      );
    }

    const widgetIds = dto.widgetIds ?? [];
    const invalidWidgets = widgetIds.filter((id) => !this.widgetRegistry.hasWidget(id));
    if (invalidWidgets.length > 0) {
      throw new BadRequestException(
        `Unknown widget-registry widget id(s): ${invalidWidgets.join(', ')}`,
      );
    }

    const version = await this.prisma.featureVersion.create({
      data: {
        featureId: feature.id,
        versionLabel: dto.versionLabel,
        actionNames: dto.actionNames,
        widgetIds,
        permissionsRequired: dto.permissionsRequired ?? [],
        changelog: dto.changelog,
      },
    });

    // A newly published version becomes the Feature's "current" one —
    // installers always land on the latest unless a future Phase 4 flow
    // deliberately pins an older one.
    await this.prisma.feature.update({
      where: { id: feature.id },
      data: { currentVersionId: version.id },
    });

    return version;
  }

  private async getFeatureOr404(id: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id } });
    if (!feature) throw new NotFoundException(`Feature "${id}" not found`);
    return feature;
  }

  private async assertOwner(userId: string, id: string) {
    const feature = await this.getFeatureOr404(id);
    if (feature.createdByUserId !== userId) {
      throw new ForbiddenException('Only the creator of this Feature may modify it');
    }
    return feature;
  }
}
