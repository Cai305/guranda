import { Module } from '@nestjs/common';
import { BlueprintsController } from './blueprints.controller';
import { BlueprintsService } from './blueprints.service';
import { BlueprintExecutionService } from './blueprint-execution.service';
import { BlueprintMarketplaceService } from './blueprint-marketplace.service';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';

@Module({
  imports: [AiRuntimeModule],
  controllers: [BlueprintsController],
  providers: [BlueprintsService, BlueprintExecutionService, BlueprintMarketplaceService],
  exports: [BlueprintsService, BlueprintExecutionService, BlueprintMarketplaceService],
})
export class BlueprintsModule {}
