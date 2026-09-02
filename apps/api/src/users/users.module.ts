import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SettingsAiToolsProvider } from './settings-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from '../profile/profile.module';
import { BlocksModule } from '../blocks/blocks.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [AuthModule, ProfileModule, BlocksModule, AchievementsModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, SettingsAiToolsProvider],
  exports: [UsersService],
})
export class UsersModule {}
