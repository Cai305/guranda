import { Module } from '@nestjs/common';
import { EditorController } from './editor.controller';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [AiRuntimeModule, FeatureFlagsModule],
  controllers: [EditorController],
})
export class EditorModule {}
