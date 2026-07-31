import { Module } from '@nestjs/common';
import { EntertainmentController } from './entertainment.controller';
import { EntertainmentService } from './entertainment.service';
import { EntertainmentAiToolsProvider } from './entertainment-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [EntertainmentController],
  providers: [
    EntertainmentService,
    PrismaService,
    EntertainmentAiToolsProvider,
  ],
  exports: [EntertainmentService],
})
export class EntertainmentModule {}
