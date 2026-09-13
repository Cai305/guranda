import { Body, Controller, Get, Param, Post, Patch, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { FeaturesService } from './features.service';
import { FeatureBuilderService } from './feature-builder.service';
import { FeatureMarketplaceService } from './feature-marketplace.service';
import { FeaturePricingType } from '@prisma/client';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { CreateFeatureVersionDto } from './dto/create-feature-version.dto';
import { UpdateFeatureStatusDto } from './dto/update-feature-status.dto';
import { GenerateFeatureDraftDto } from './dto/generate-feature-draft.dto';
import { SaveFeatureDraftDto } from './dto/save-feature-draft.dto';
import { FeatureTestRunDto } from './dto/feature-test-run.dto';
import { ReviewFeatureDto } from './dto/review-feature.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(JwtAuthGuard)
@Controller('features')
export class FeaturesController {
  constructor(
    private readonly features: FeaturesService,
    private readonly featureBuilder: FeatureBuilderService,
    private readonly marketplace: FeatureMarketplaceService,
  ) {}

  @Post()
  create(@Body() body: CreateFeatureDto, @Request() req: any) {
    return this.features.create(req.user.userId, body);
  }

  @Get('mine')
  listMine(@Request() req: any) {
    return this.features.listMine(req.user.userId);
  }

  @Get('mine/installed')
  myInstalled(@Request() req: any) {
    return this.marketplace.myInstalled(req.user.userId);
  }

  // Marketplace (Phase 4). 'browse' is a static segment — must come before
  // ':id' below so Nest never treats it as a Feature id (same reasoning as
  // 'mine'/'builder').
  @Get('browse')
  browse(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('pricingType') pricingType?: FeaturePricingType,
  ) {
    return this.marketplace.browse({ search, category, pricingType });
  }

  // Feature Builder (Phase 3). Static 'builder/...' segments — must come
  // before ':id' below so Nest never treats 'builder' as a Feature id.
  @Post('builder/draft')
  generateDraft(@Body() body: GenerateFeatureDraftDto, @Request() req: any) {
    return this.featureBuilder.generateFeatureDraft(req.user.userId, body.description);
  }

  @Post('builder/save-draft')
  saveDraft(@Body() body: SaveFeatureDraftDto, @Request() req: any) {
    return this.featureBuilder.saveDraftAsFeature(req.user.userId, body);
  }

  @Post('builder/test-run')
  testRun(@Body() body: FeatureTestRunDto, @Request() req: any) {
    return this.featureBuilder.testRun(req.user.userId, body);
  }

  // Must come after 'mine'/'builder' so Nest doesn't treat them as an :id.
  @Get()
  list() {
    return this.features.listPublished();
  }

  // Extended (Phase 4) to include real stats — average rating, review
  // count, install count — computed live, not just the plain Feature row.
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.marketplace.getFeatureWithStats(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateFeatureStatusDto, @Request() req: any) {
    return this.features.updateStatus(req.user.userId, id, body.status);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.features.listVersions(id);
  }

  @Post(':id/versions')
  createVersion(@Param('id') id: string, @Body() body: CreateFeatureVersionDto, @Request() req: any) {
    return this.features.createVersion(req.user.userId, id, body);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Request() req: any) {
    return this.marketplace.publish(req.user.userId, id);
  }

  @Post(':id/purchase')
  purchase(@Param('id') id: string, @Request() req: any) {
    return this.marketplace.purchase(req.user.userId, id);
  }

  @Post(':id/install')
  install(@Param('id') id: string, @Request() req: any) {
    return this.marketplace.install(req.user.userId, id);
  }

  @Post(':id/uninstall')
  uninstall(@Param('id') id: string, @Request() req: any) {
    return this.marketplace.uninstall(req.user.userId, id);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() body: ReviewFeatureDto, @Request() req: any) {
    return this.marketplace.review(req.user.userId, id, body.rating, body.comment);
  }
}
