import { Module } from '@nestjs/common';
import {
  WalletsController,
  AdminDepositsController,
} from './wallets.controller';
import { WalletsService } from './wallets.service';
import { FinancialEngineService } from './financial-engine.service';
import { WalletAiToolsProvider } from './wallet-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { VerificationModule } from '../verification/verification.module';
import { AdminModule } from '../admin/admin.module';
import { EventsModule } from '../events/events.module';
import { ProfileModule } from '../profile/profile.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [VerificationModule, AdminModule, EventsModule, ProfileModule, NotificationsModule],
  controllers: [WalletsController, AdminDepositsController],
  providers: [WalletsService, FinancialEngineService, PrismaService, WalletAiToolsProvider],
  exports: [WalletsService, FinancialEngineService],
})
export class WalletsModule {}
