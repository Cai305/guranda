import { Module } from '@nestjs/common';
import {
  WalletsController,
  AdminDepositsController,
} from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletAiToolsProvider } from './wallet-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { VerificationModule } from '../verification/verification.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [VerificationModule, AdminModule],
  controllers: [WalletsController, AdminDepositsController],
  providers: [WalletsService, PrismaService, WalletAiToolsProvider],
  exports: [WalletsService],
})
export class WalletsModule {}
