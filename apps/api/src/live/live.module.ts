import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';
import { LiveGateway } from './live.gateway';
import { PrismaService } from '../prisma.service';
import { ShoppingModule } from '../shopping/shopping.module';
import { EatModule } from '../eat/eat.module';
import { ChatModule } from '../chat/chat.module';
import { RankingModule } from '../ranking/ranking.module';
import { LiveAiToolsProvider } from './live-ai-tools.provider';
import { ChessModule } from '../chess/chess.module';
import { FriendsModule } from '../friends/friends.module';
import { ProfileModule } from '../profile/profile.module';
import { RideModule } from '../ride/ride.module';

@Module({
  imports: [ShoppingModule, EatModule, ChatModule, RankingModule, ChessModule, FriendsModule, ProfileModule, RideModule],
  controllers: [LiveController],
  providers: [LiveService, LiveGateway, PrismaService, LiveAiToolsProvider],
  exports: [LiveGateway, LiveService],
})
export class LiveModule {}
