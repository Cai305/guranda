import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { LearningAiToolsProvider } from './learning-ai-tools.provider';

@Module({
  controllers: [LearningController],
  providers: [LearningService, LearningAiToolsProvider],
  exports: [LearningService],
})
export class LearningModule {}
