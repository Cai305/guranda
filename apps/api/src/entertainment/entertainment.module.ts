import { Module } from '@nestjs/common';
import { EntertainmentController } from './entertainment.controller';
import { EntertainmentService } from './entertainment.service';
import { EntertainmentAiToolsProvider } from './entertainment-ai-tools.provider';

@Module({
  controllers: [EntertainmentController],
  providers: [
    EntertainmentService,
    EntertainmentAiToolsProvider,
  ],
  exports: [EntertainmentService],
})
export class EntertainmentModule {}
