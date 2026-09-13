import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { BadgeService } from './badge.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, BadgeService],
  exports: [ProfileService, BadgeService],
})
export class ProfileModule {}
