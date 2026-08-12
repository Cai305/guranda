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

@Module({
  imports: [RankingModule, EventsModule, MentionsModule, ProfileModule],
  controllers: [PostsController],
  providers: [PostsService, PrismaService, PostsAiToolsProvider, PostsGateway],
  exports: [PostsService],
})
export class PostsModule {}
