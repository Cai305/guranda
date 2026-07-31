import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SettingsAiToolsProvider } from './settings-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, SettingsAiToolsProvider],
  exports: [UsersService],
})
export class UsersModule {}
