import { Module } from '@nestjs/common';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';
import { PrismaService } from '../prisma.service';
import { VerificationModule } from '../verification/verification.module';
import { LiveModule } from '../live/live.module';
import { GiftsAiToolsProvider } from './gifts-ai-tools.provider';

@Module({
  imports: [VerificationModule, LiveModule],
  controllers: [GiftsController],
  providers: [GiftsService, PrismaService, GiftsAiToolsProvider],
  exports: [GiftsService],
})
export class GiftsModule {}
