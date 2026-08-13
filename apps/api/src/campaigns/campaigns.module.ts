import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsAdminController } from './campaigns-admin.controller';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [CampaignsController, CampaignsAdminController],
  providers: [CampaignsService, PrismaService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
