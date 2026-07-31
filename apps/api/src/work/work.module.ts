import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WorkAiToolsProvider } from './work-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [WorkController],
  providers: [WorkService, PrismaService, WorkAiToolsProvider],
  exports: [WorkService],
})
export class WorkModule {}
