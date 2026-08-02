import { Module } from '@nestjs/common';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { PrismaService } from '../prisma.service';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';

@Module({
  imports: [AiRuntimeModule],
  controllers: [CouplesController],
  providers: [CouplesService, PrismaService],
  exports: [CouplesService],
})
export class CouplesModule {}
