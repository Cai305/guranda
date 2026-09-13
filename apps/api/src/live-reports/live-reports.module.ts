import { Module } from '@nestjs/common';
import { LiveReportsService } from './live-reports.service';
import { LiveReportsController } from './live-reports.controller';

@Module({
  controllers: [LiveReportsController],
  providers: [LiveReportsService],
  exports: [LiveReportsService],
})
export class LiveReportsModule {}
