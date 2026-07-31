import { Module } from '@nestjs/common';
import { DailyChallengesController } from './daily-challenges.controller';
import { DailyChallengesService } from './daily-challenges.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [DailyChallengesController],
  providers: [DailyChallengesService, PrismaService],
  exports: [DailyChallengesService],
})
export class DailyChallengesModule {}
