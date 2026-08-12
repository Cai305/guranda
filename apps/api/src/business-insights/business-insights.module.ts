import { Module } from '@nestjs/common';
import { BusinessInsightsController } from './business-insights.controller';
import { BusinessInsightsService } from './business-insights.service';
import { PrismaService } from '../prisma.service';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [AiRuntimeModule, FeatureFlagsModule],
  controllers: [BusinessInsightsController],
  providers: [BusinessInsightsService, PrismaService],
  exports: [BusinessInsightsService],
})
export class BusinessInsightsModule {}
