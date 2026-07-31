import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RankingModule } from '../ranking/ranking.module';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdsAiToolsProvider } from './ads-ai-tools.provider';

@Module({
  imports: [RankingModule],
  controllers: [AdsController],
  providers: [AdsService, PrismaService, AdsAiToolsProvider],
})
export class AdsModule {}
