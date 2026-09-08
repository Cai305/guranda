import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { PrismaService } from '../prisma.service';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiRuntimeModule } from '../ai-runtime/ai-runtime.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [OpportunitiesModule, NotificationsModule, AiRuntimeModule, AdminModule],
  controllers: [HomeController],
  providers: [HomeService, PrismaService],
})
export class HomeModule {}
