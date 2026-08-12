import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { BadgeService } from './badge.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, BadgeService, PrismaService],
  exports: [ProfileService, BadgeService],
})
export class ProfileModule {}
