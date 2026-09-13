import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WorkAiToolsProvider } from './work-ai-tools.provider';

@Module({
  controllers: [WorkController],
  providers: [WorkService, WorkAiToolsProvider],
  exports: [WorkService],
})
export class WorkModule {}
