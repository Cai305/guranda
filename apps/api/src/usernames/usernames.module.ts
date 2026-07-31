import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersModule } from '../users/users.module';
import { UsernameService } from './username.service';
import { UsernameController } from './username.controller';
import { ReservedUsernameAdminController } from './reserved-username.controller';
import { UsernameAiToolsProvider } from './username-ai-tools.provider';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [UsersModule, AdminModule],
  controllers: [UsernameController, ReservedUsernameAdminController],
  providers: [UsernameService, PrismaService, UsernameAiToolsProvider],
  exports: [UsernameService],
})
export class UsernamesModule {}
