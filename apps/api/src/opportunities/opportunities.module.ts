import { Module } from '@nestjs/common';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma.service';
import { ChallengesModule } from '../challenges/challenges.module';

@Module({
  imports: [ChallengesModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService, PrismaService],
})
export class OpportunitiesModule {}
