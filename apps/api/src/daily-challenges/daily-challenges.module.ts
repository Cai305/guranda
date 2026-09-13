import { Module } from '@nestjs/common';
import { DailyChallengesController } from './daily-challenges.controller';
import { DailyChallengesService } from './daily-challenges.service';

@Module({
  controllers: [DailyChallengesController],
  providers: [DailyChallengesService],
  exports: [DailyChallengesService],
})
export class DailyChallengesModule {}
