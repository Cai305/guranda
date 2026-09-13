import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsGateway } from './posts.gateway';
import { RankingModule } from '../ranking/ranking.module';
import { PostsAiToolsProvider } from './posts-ai-tools.provider';
import { EventsModule } from '../events/events.module';
import { MentionsModule } from '../mentions/mentions.module';
import { ProfileModule } from '../profile/profile.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlocksModule } from '../blocks/blocks.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { IntegrationsModule } from '../integrations/integrations.module';

// AiRuntimeModule: publishEverywhere (Phase 8) calls posts.create and
// telegram.sendMessage through the real ActionExecutorService — the same
// permission-checked, audit-logged path a Blueprint run or the AI itself
// uses, not a second hand-rolled call path (see PostsService.publishEverywhere).
// IntegrationsModule: to resolve the user's real Telegram default publish
// chat_id (see IntegrationsService.getTelegramDefaultChatId).
@Module({
  imports: [
    RankingModule,
    EventsModule,
    MentionsModule,
    ProfileModule,
    NotificationsModule,
    BlocksModule,
    AchievementsModule,
    AiRuntimeModule,
    IntegrationsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, PostsAiToolsProvider, PostsGateway],
  exports: [PostsService],
})
export class PostsModule {}
