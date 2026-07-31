import { Module } from '@nestjs/common';
import { HealthAppController } from './health-app.controller';
import { HealthAppService } from './health-app.service';
import { HealthAiToolsProvider } from './health-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [HealthAppController],
  providers: [HealthAppService, PrismaService, HealthAiToolsProvider],
  exports: [HealthAppService],
})
export class HealthAppModule {}
