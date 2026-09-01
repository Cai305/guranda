import { Module, forwardRef } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardsGateway } from './cards.gateway';
import { PrismaService } from '../prisma.service';
import { CardsAiToolsProvider } from './cards-ai-tools.provider';
import { CardsFinishHooksProvider } from './cards-finish-hooks.provider';
import { ToolRegistryModule } from '../tool-registry/tool-registry.module';
import { FriendsModule } from '../friends/friends.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { DailyChallengesModule } from '../daily-challenges/daily-challenges.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { CardsTournamentsModule } from '../cards-tournaments/cards-tournaments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ToolRegistryModule,
    FriendsModule,
    AchievementsModule,
    DailyChallengesModule,
    ReferralsModule,
    forwardRef(() => CardsTournamentsModule),
    NotificationsModule,
  ],
  controllers: [CardsController],
  providers: [CardsService, CardsGateway, PrismaService, CardsAiToolsProvider, CardsFinishHooksProvider],
  exports: [CardsService],
})
export class CardsModule {}
