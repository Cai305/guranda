import { Module } from '@nestjs/common';
import { TravelController } from './travel.controller';
import { TravelService } from './travel.service';
import { TravelAiToolsProvider } from './travel-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [VerificationModule],
  controllers: [TravelController],
  providers: [TravelService, PrismaService, TravelAiToolsProvider],
  exports: [TravelService],
})
export class TravelModule {}
