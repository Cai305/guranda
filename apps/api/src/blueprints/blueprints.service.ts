import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ToolRegistryService } from '../tool-registry/tool-registry.service';
import { BlueprintStatus, MarketplaceVisibility } from '@prisma/client';
import { CreateBlueprintDto } from './dto/create-blueprint.dto';
import { CreateBlueprintVersionDto } from './dto/create-blueprint-version.dto';

// Phase 1: real create/list/get for the Blueprint entity — a saved,
// deterministic multi-step workflow over tool-registry actions (see
// schema.prisma's Blueprint/BlueprintVersion doc comment). Deliberately
// does not implement: actually RUNNING a Blueprint's steps (Phase 2's
// BlueprintExecutorService will write BlueprintRun rows), or Marketplace
// purchase/install (Phase 4). Every step's actionName is validated against
// the real Action Registry at version-creation time.
@Injectable()
export class BlueprintsService {
  constructor(
    private prisma: PrismaService,
    private toolRegistry: ToolRegistryService,
  ) {}

  async create(userId: string, dto: CreateBlueprintDto) {
    const requiredFeatureIds = dto.requiredFeatureIds ?? [];
    if (requiredFeatureIds.length > 0) {
      const found = await this.prisma.feature.findMany({
        where: { id: { in: requiredFeatureIds } },
        select: { id: true },
      });
      const foundIds = new Set(found.map((f) => f.id));
      const missing = requiredFeatureIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(`Unknown Feature id(s): ${missing.join(', ')}`);
      }
    }

    return this.prisma.blueprint.create({
      data: {
        name: dto.name,
        description: dto.description,
        visibility: dto.visibility ?? undefined,
        requiredFeatureIds,
        pricingType: dto.pricingType ?? undefined,
        price: dto.price ?? undefined,
        createdByUserId: userId,
      },
    });
  }

  async listPublished() {
    return this.prisma.blueprint.findMany({
      where: {
        status: BlueprintStatus.PUBLISHED,
        visibility: { in: [MarketplaceVisibility.PUBLIC, MarketplaceVisibility.MARKETPLACE] },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listMine(userId: string) {
    return this.prisma.blueprint.findMany({
      where: { createdByUserId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(id: string) {
    const blueprint = await this.prisma.blueprint.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        createdByUser: { select: { id: true, username: true } },
      },
    });
    if (!blueprint) throw new NotFoundException(`Blueprint "${id}" not found`);
    return blueprint;
  }

  async updateStatus(userId: string, id: string, status: BlueprintStatus) {
    const blueprint = await this.assertOwner(userId, id);
    return this.prisma.blueprint.update({
      where: { id: blueprint.id },
      data: { status },
    });
  }

  async listVersions(id: string) {
    await this.getBlueprintOr404(id);
    return this.prisma.blueprintVersion.findMany({
      where: { blueprintId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVersion(userId: string, blueprintId: string, dto: CreateBlueprintVersionDto) {
    const blueprint = await this.assertOwner(userId, blueprintId);

    if (dto.steps.length === 0) {
      throw new BadRequestException('A Blueprint version needs at least one step');
    }
    const invalidActions = dto.steps
      .map((s) => s.actionName)
      .filter((name) => !this.toolRegistry.hasTool(name));
    if (invalidActions.length > 0) {
      throw new BadRequestException(
        `Unknown tool-registry action name(s): ${invalidActions.join(', ')}`,
      );
    }

    return this.prisma.blueprintVersion.create({
      data: {
        blueprintId: blueprint.id,
        versionLabel: dto.versionLabel,
        steps: dto.steps as any,
        changelog: dto.changelog,
      },
    });
  }

  private async getBlueprintOr404(id: string) {
    const blueprint = await this.prisma.blueprint.findUnique({ where: { id } });
    if (!blueprint) throw new NotFoundException(`Blueprint "${id}" not found`);
    return blueprint;
  }

  private async assertOwner(userId: string, id: string) {
    const blueprint = await this.getBlueprintOr404(id);
    if (blueprint.createdByUserId !== userId) {
      throw new ForbiddenException('Only the creator of this Blueprint may modify it');
    }
    return blueprint;
  }
}
