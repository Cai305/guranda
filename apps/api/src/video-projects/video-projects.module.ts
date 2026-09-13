import { Module } from '@nestjs/common';
import { VideoProjectsController } from './video-projects.controller';
import { VideoProjectsService } from './video-projects.service';
import { VideoRenderService } from './video-render.service';
import { VideoTemplatesModule } from '../video-templates/video-templates.module';
import { PerformancesModule } from '../performances/performances.module';

@Module({
  imports: [VideoTemplatesModule, PerformancesModule],
  controllers: [VideoProjectsController],
  providers: [VideoProjectsService, VideoRenderService],
})
export class VideoProjectsModule {}
