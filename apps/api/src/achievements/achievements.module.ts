import { Module } from '@nestjs/common';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { PrismaService } from '../prisma.service';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [ProfileModule],
  controllers: [AchievementsController],
  providers: [AchievementsService, PrismaService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
