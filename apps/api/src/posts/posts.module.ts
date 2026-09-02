import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsGateway } from './posts.gateway';
import { PrismaService } from '../prisma.service';
import { RankingModule } from '../ranking/ranking.module';
import { PostsAiToolsProvider } from './posts-ai-tools.provider';
import { EventsModule } from '../events/events.module';
import { MentionsModule } from '../mentions/mentions.module';
import { ProfileModule } from '../profile/profile.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlocksModule } from '../blocks/blocks.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [RankingModule, EventsModule, MentionsModule, ProfileModule, NotificationsModule, BlocksModule, AchievementsModule],
  controllers: [PostsController],
  providers: [PostsService, PrismaService, PostsAiToolsProvider, PostsGateway],
  exports: [PostsService],
})
export class PostsModule {}
