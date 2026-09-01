import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceAiToolsProvider } from './marketplace-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, PrismaService, MarketplaceAiToolsProvider],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
