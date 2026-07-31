import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PrismaService } from '../prisma.service';
import { RankingModule } from '../ranking/ranking.module';
import { PostsAiToolsProvider } from './posts-ai-tools.provider';

@Module({
  imports: [RankingModule],
  controllers: [PostsController],
  providers: [PostsService, PrismaService, PostsAiToolsProvider],
})
export class PostsModule {}
