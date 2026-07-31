import { Module } from '@nestjs/common';
import { HairController } from './hair.controller';
import { HairService } from './hair.service';
import { HairAiToolsProvider } from './hair-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [HairController],
  providers: [HairService, PrismaService, HairAiToolsProvider],
  exports: [HairService],
})
export class HairModule {}
