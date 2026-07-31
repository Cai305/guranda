import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { LearningAiToolsProvider } from './learning-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LearningController],
  providers: [LearningService, PrismaService, LearningAiToolsProvider],
  exports: [LearningService],
})
export class LearningModule {}
