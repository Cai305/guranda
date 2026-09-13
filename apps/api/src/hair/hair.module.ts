import { Module } from '@nestjs/common';
import { HairController } from './hair.controller';
import { HairService } from './hair.service';
import { HairAiToolsProvider } from './hair-ai-tools.provider';

@Module({
  controllers: [HairController],
  providers: [HairService, HairAiToolsProvider],
  exports: [HairService],
})
export class HairModule {}
