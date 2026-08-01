import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesAdminController } from './challenges-admin.controller';
import { ChallengesService } from './challenges.service';
import { PrismaService } from '../prisma.service';
import { AdminModule } from '../admin/admin.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [AdminModule, AchievementsModule],
  controllers: [ChallengesController, ChallengesAdminController],
  providers: [ChallengesService, PrismaService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
