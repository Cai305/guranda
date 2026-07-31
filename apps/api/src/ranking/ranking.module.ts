import { Module } from '@nestjs/common';
import { ContentRankingService } from './content-ranking.service';

@Module({
  providers: [ContentRankingService],
  exports: [ContentRankingService],
})
export class RankingModule {}
