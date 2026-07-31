import { Module } from '@nestjs/common';
import { EatController } from './eat.controller';
import { EatService } from './eat.service';
import { EatAiToolsProvider } from './eat-ai-tools.provider';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [EatController],
  providers: [EatService, PrismaService, EatAiToolsProvider],
  exports: [EatService],
})
export class EatModule {}
