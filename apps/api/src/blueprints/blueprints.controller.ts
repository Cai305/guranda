import { Body, Controller, Get, Param, Post, Patch, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { BlueprintsService } from './blueprints.service';
import { BlueprintExecutionService } from './blueprint-execution.service';
import { BlueprintMarketplaceService } from './blueprint-marketplace.service';
import { FeaturePricingType } from '@prisma/client';
import { CreateBlueprintDto } from './dto/create-blueprint.dto';
import { CreateBlueprintVersionDto } from './dto/create-blueprint-version.dto';
import { UpdateBlueprintStatusDto } from './dto/update-blueprint-status.dto';
import { RunBlueprintDto } from './dto/run-blueprint.dto';
import { ReviewBlueprintDto } from './dto/review-blueprint.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(JwtAuthGuard)
@Controller('blueprints')
export class BlueprintsController {
  constructor(
    private readonly blueprints: BlueprintsService,
    private readonly execution: BlueprintExecutionService,
    private readonly marketplace: BlueprintMarketplaceService,
  ) {}

  @Post()
  create(@Body() body: CreateBlueprintDto, @Request() req: any) {
    return this.blueprints.create(req.user.userId, body);
  }

  @Get('mine')
  listMine(@Request() req: any) {
    return this.blueprints.listMine(req.user.userId);
  }

  // Both must come before ':id' so Nest doesn't treat 'runs' as a Blueprint id
  // (same reasoning as 'mine' above).
  @Get('runs')
  listRuns(@Query('blueprintId') blueprintId: string | undefined, @Request() req: any) {
    return this.execution.listRuns(req.user.userId, blueprintId);
  }

  @Get('runs/:runId')
  getRun(@Param('runId') runId: string, @Request() req: any) {
    return this.execution.getRun(req.user.userId, runId);
  }

  // Marketplace (Phase 4). Static segment — must come before ':id' below,
  // same reasoning as 'mine'/'runs'.
  @Get('browse')
  browse(@Query('search') search?: string, @Query('pricingType') pricingType?: FeaturePricingType) {
    return this.marketplace.browse({ search, pricingType });
  }

  // Must come after 'mine' so Nest doesn't treat 'mine' as an :id.
  @Get()
  list() {
    return this.blueprints.listPublished();
  }

  // Extended (Phase 4) to include real stats — average rating, review
  // count, purchase count — computed live.
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.marketplace.getBlueprintWithStats(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateBlueprintStatusDto, @Request() req: any) {
    return this.blueprints.updateStatus(req.user.userId, id, body.status);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.blueprints.listVersions(id);
  }

  @Post(':id/versions')
  createVersion(@Param('id') id: string, @Body() body: CreateBlueprintVersionDto, @Request() req: any) {
    return this.blueprints.createVersion(req.user.userId, id, body);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Request() req: any) {
    return this.marketplace.publish(req.user.userId, id);
  }

  @Post(':id/purchase')
  purchase(@Param('id') id: string, @Request() req: any) {
    return this.marketplace.purchase(req.user.userId, id);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() body: ReviewBlueprintDto, @Request() req: any) {
    return this.marketplace.review(req.user.userId, id, body.rating, body.comment);
  }

  @Post('versions/:versionId/run')
  runVersion(@Param('versionId') versionId: string, @Body() body: RunBlueprintDto, @Request() req: any) {
    return this.execution.runBlueprint(req.user.userId, versionId, body.variables);
  }
}
