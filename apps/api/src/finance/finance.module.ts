import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { XrplService } from './xrpl.service';
import { FinanceAiToolsProvider } from './finance-ai-tools.provider';

@Module({
  controllers: [FinanceController],
  providers: [
    FinanceService,
    XrplService,
    FinanceAiToolsProvider,
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
