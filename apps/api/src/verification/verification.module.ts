import { Module } from '@nestjs/common';
import {
  VerificationController,
  AdminVerificationController,
} from './verification.controller';
import { VerificationService } from './verification.service';
import { VerificationAiToolsProvider } from './verification-ai-tools.provider';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [VerificationController, AdminVerificationController],
  providers: [VerificationService, VerificationAiToolsProvider],
  exports: [VerificationService],
})
export class VerificationModule {}
