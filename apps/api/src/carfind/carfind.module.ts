import { Module } from '@nestjs/common';
import { CarFindController } from './carfind.controller';
import { CarFindService } from './carfind.service';
import { CarFindAiToolsProvider } from './carfind-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CarFindController],
  providers: [CarFindService, PrismaService, CarFindAiToolsProvider],
  exports: [CarFindService],
})
export class CarFindModule {}
