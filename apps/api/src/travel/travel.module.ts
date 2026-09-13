import { Module } from '@nestjs/common';
import { TravelController } from './travel.controller';
import { TravelService } from './travel.service';
import { TravelAiToolsProvider } from './travel-ai-tools.provider';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [VerificationModule],
  controllers: [TravelController],
  providers: [TravelService, TravelAiToolsProvider],
  exports: [TravelService],
})
export class TravelModule {}
