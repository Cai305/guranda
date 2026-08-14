import { Module } from '@nestjs/common';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';
import { PrismaService } from '../prisma.service';
import { VerificationModule } from '../verification/verification.module';
import { LiveModule } from '../live/live.module';
import { WalletsModule } from '../wallets/wallets.module';
import { GiftsAiToolsProvider } from './gifts-ai-tools.provider';

@Module({
  imports: [VerificationModule, LiveModule, WalletsModule],
  controllers: [GiftsController],
  providers: [GiftsService, PrismaService, GiftsAiToolsProvider],
  exports: [GiftsService],
})
export class GiftsModule {}
