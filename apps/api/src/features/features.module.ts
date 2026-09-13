import { Module } from '@nestjs/common';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { FeatureBuilderService } from './feature-builder.service';
import { FeatureMarketplaceService } from './feature-marketplace.service';
import { WidgetRegistryModule } from '../widget-registry/widget-registry.module';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { BlueprintsModule } from '../blueprints/blueprints.module';

@Module({
  // AiRuntimeModule: LLM_ADAPTER for FeatureBuilderService's real generation
  // call. BlueprintsModule: BlueprintExecutionService.runSteps, reused by
  // FeatureBuilderService.testRun rather than duplicating the step-execution
  // loop (see that service's doc comment).
  imports: [WidgetRegistryModule, AiRuntimeModule, BlueprintsModule],
  controllers: [FeaturesController],
  providers: [FeaturesService, FeatureBuilderService, FeatureMarketplaceService],
  exports: [FeaturesService, FeatureBuilderService, FeatureMarketplaceService],
})
export class FeaturesModule {}
