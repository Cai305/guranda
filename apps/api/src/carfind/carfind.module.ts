import { Module } from '@nestjs/common';
import { CarFindController } from './carfind.controller';
import { CarFindService } from './carfind.service';
import { CarFindAiToolsProvider } from './carfind-ai-tools.provider';

@Module({
  controllers: [CarFindController],
  providers: [CarFindService, CarFindAiToolsProvider],
  exports: [CarFindService],
})
export class CarFindModule {}
