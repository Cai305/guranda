import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesAdminController } from './challenges-admin.controller';
import { ChallengesService } from './challenges.service';
import { ChallengeGeneratorService } from './challenge-generator.service';
import { ChallengeSponsorshipService } from './challenge-sponsorship.service';
import { PrismaService } from '../prisma.service';
import { AdminModule } from '../admin/admin.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AdminModule, AchievementsModule, AiRuntimeModule, FeatureFlagsModule, NotificationsModule],
  controllers: [ChallengesController, ChallengesAdminController],
  providers: [ChallengesService, ChallengeGeneratorService, ChallengeSponsorshipService, PrismaService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
