import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripSensitiveInterceptor } from './common/strip-sensitive.interceptor';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { WalletsModule } from './wallets/wallets.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { CommunitiesModule } from './communities/communities.module';
import { ChessModule } from './chess/chess.module';
import { StoreModule } from './store/store.module';
import { LiveModule } from './live/live.module';
import { LudoModule } from './ludo/ludo.module';
import { MurabarabaModule } from './murabaraba/murabaraba.module';
import { TurboRacingModule } from './turbo-racing/turbo-racing.module';
import { RideModule } from './ride/ride.module';
import { EatModule } from './eat/eat.module';
import { ScanToPayModule } from './scan-to-pay/scan-to-pay.module';
import { UploadModule } from './upload/upload.module';
import { VideoModule } from './video/video.module';
import { AiModule } from './ai/ai.module';
import { MoonbaseModule } from './moonbase/moonbase.module';
import { PoolModule } from './pool/pool.module';
import { StoryModule } from './story/story.module';
import { PropertyModule } from './property/property.module';
import { VerificationModule } from './verification/verification.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { WordBattleModule } from './word-battle/word-battle.module';
import { CardsModule } from './cards/cards.module';
import { FriendsModule } from './friends/friends.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AchievementsModule } from './achievements/achievements.module';
import { DailyChallengesModule } from './daily-challenges/daily-challenges.module';
import { ReferralsModule } from './referrals/referrals.module';
import { CardsTournamentsModule } from './cards-tournaments/cards-tournaments.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { GiftsModule } from './gifts/gifts.module';
import { ActivityModule } from './activity/activity.module';
import { ShoppingModule } from './shopping/shopping.module';
import { TravelModule } from './travel/travel.module';
import { WorkModule } from './work/work.module';
import { HealthAppModule } from './health/health-app.module';
import { FinanceModule } from './finance/finance.module';
import { LearningModule } from './learning/learning.module';
import { HairModule } from './hair/hair.module';
import { EntertainmentModule } from './entertainment/entertainment.module';
import { ToolRegistryModule } from './tool-registry/tool-registry.module';
import { McpModule } from './mcp/mcp.module';
import { CarFindModule } from './carfind/carfind.module';
import { UsernamesModule } from './usernames/usernames.module';
import { RankingModule } from './ranking/ranking.module';
import { AdsModule } from './ads/ads.module';
import { GifModule } from './gif/gif.module';
import { CarwashModule } from './carwash/carwash.module';
import { LiveReportsModule } from './live-reports/live-reports.module';
import { ChallengesModule } from './challenges/challenges.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { CouplesModule } from './couples/couples.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReactionsModule } from './reactions/reactions.module';
import { TrustSafetyModule } from './trust-safety/trust-safety.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { EditorModule } from './editor/editor.module';
import { AssistantModule } from './assistant/assistant.module';
import { ProfileModule } from './profile/profile.module';
import { TrendingModule } from './trending/trending.module';
import { BusinessInsightsModule } from './business-insights/business-insights.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { VotingModule } from './voting/voting.module';
import { DeviceModule } from './device/device.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Global in-memory cache with a 60-second default TTL and a maximum of 500
    // entries. Swap the store option for 'ioredis' to move to Redis with zero
    // other code changes. TTLs on individual endpoints override this default.
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,  // 60 s in milliseconds (cache-manager v5+)
      max: 500,      // maximum items in the LRU cache
    }),
    // Global default: 60 requests/min per IP across the whole API. Login and
    // register carry their own tighter @Throttle() override (see
    // users.controller.ts) since credential-stuffing/brute-force is the
    // realistic threat there specifically.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ToolRegistryModule,
    AdminModule,
    AuthModule,
    UsersModule,
    ChatModule,
    WalletsModule,
    PostsModule,
    CommunitiesModule,
    ChessModule,
    StoreModule,
    LiveModule,
    LudoModule,
    RideModule,
    EatModule,
    ScanToPayModule,
    UploadModule,
    EditorModule,
    VideoModule,
    AiModule,
    MoonbaseModule,
    PoolModule,
    StoryModule,
    PropertyModule,
    VerificationModule,
    FeatureFlagsModule,
    WordBattleModule,
    CardsModule,
    FriendsModule,
    LeaderboardModule,
    AchievementsModule,
    DailyChallengesModule,
    ReferralsModule,
    CardsTournamentsModule,
    MarketplaceModule,
    GiftsModule,
    ActivityModule,
    LiveReportsModule,
    ShoppingModule,
    TravelModule,
    WorkModule,
    HealthAppModule,
    FinanceModule,
    VotingModule,
    LearningModule,
    HairModule,
    MurabarabaModule,
    TurboRacingModule,
    EntertainmentModule,
    McpModule,
    CarFindModule,
    UsernamesModule,
    RankingModule,
    AdsModule,
    GifModule,
    CarwashModule,
    ChallengesModule,
    RelationshipsModule,
    CouplesModule,
    NotificationsModule,
    ReactionsModule,
    TrustSafetyModule,
    IntelligenceModule,
    AssistantModule,
    ProfileModule,
    TrendingModule,
    BusinessInsightsModule,
    CampaignsModule,
    AnnouncementsModule,
    OpportunitiesModule,
    CapabilitiesModule,
    DeviceModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Strips passwordHash/encryptedSeed from every REST response — see
    // common/strip-sensitive.interceptor.ts for why this runs globally
    // rather than per-query.
    { provide: APP_INTERCEPTOR, useClass: StripSensitiveInterceptor },
  ],
})
export class AppModule {}
