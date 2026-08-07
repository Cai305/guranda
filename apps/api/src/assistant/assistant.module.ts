import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [AiRuntimeModule, FeatureFlagsModule],
  controllers: [AssistantController],
})
export class AssistantModule {}
