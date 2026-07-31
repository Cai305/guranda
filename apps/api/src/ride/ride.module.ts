import { Module } from '@nestjs/common';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import { RideGateway } from './ride.gateway';
import { RideAiToolsProvider } from './ride-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule],
  controllers: [RideController],
  providers: [RideService, RideGateway, PrismaService, RideAiToolsProvider],
  exports: [RideService],
})
export class RideModule {}
