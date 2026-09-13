import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { RankingModule } from '../ranking/ranking.module';
import { VideoAiToolsProvider } from './video-ai-tools.provider';
import { VideoTranscodeService } from './video-transcode.service';
import { VideoRewardService } from './video-reward.service';
import { ProfileModule } from '../profile/profile.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [RankingModule, ProfileModule, NotificationsModule],
  controllers: [VideoController],
  providers: [
    VideoService,
    VideoAiToolsProvider,
    VideoTranscodeService,
    VideoRewardService,
  ],
  exports: [VideoService],
})
export class VideoModule {}
