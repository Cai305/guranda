import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { PrismaService } from '../prisma.service';
import { RankingModule } from '../ranking/ranking.module';
import { VideoAiToolsProvider } from './video-ai-tools.provider';

@Module({
  imports: [RankingModule],
  controllers: [VideoController],
  providers: [VideoService, PrismaService, VideoAiToolsProvider],
})
export class VideoModule {}
