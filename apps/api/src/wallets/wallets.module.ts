import { Module } from '@nestjs/common';
import {
  WalletsController,
  AdminDepositsController,
} from './wallets.controller';
import { WalletsService } from './wallets.service';
import { FinancialEngineService } from './financial-engine.service';
import { WalletAiToolsProvider } from './wallet-ai-tools.provider';
import { VerificationModule } from '../verification/verification.module';
import { AdminModule } from '../admin/admin.module';
import { EventsModule } from '../events/events.module';
import { ProfileModule } from '../profile/profile.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlocksModule } from '../blocks/blocks.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [VerificationModule, AdminModule, EventsModule, ProfileModule, NotificationsModule, BlocksModule, FriendsModule],
  controllers: [WalletsController, AdminDepositsController],
  providers: [WalletsService, FinancialEngineService, WalletAiToolsProvider],
  exports: [WalletsService, FinancialEngineService],
})
export class WalletsModule {}
