import { Module } from '@nestjs/common';
import { LiveReportsService } from './live-reports.service';
import { LiveReportsController } from './live-reports.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LiveReportsController],
  providers: [LiveReportsService, PrismaService],
  exports: [LiveReportsService],
})
export class LiveReportsModule {}
